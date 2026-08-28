import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { Collection } from "mongodb";
import { Inject } from "@nestjs/common";
import { MONGO_DB } from "../infra/mongo/mongo.module";
import type { Db } from "mongodb";
import { AppError } from "../infra/errors/app-error";
import { AuditService } from "../audit/audit.service";
import { ReniecClient, type ReniecDniLookupResult } from "../infra/http/reniec.client";
import { JWT_ACCESS_TTL_DEFAULT, JWT_REFRESH_TTL_DEFAULT } from "../config/defaults";
import type { AuthResponse, AuthStatusDto, UsuarioDto } from "./dto/auth.response";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";

interface UsuarioDoc {
  id_usuario: string;
  username: string;
  password_hash: string;
  rol: string;
  activo: number;
  persona_id: string | null;
  dni: string | null;
  nombre_completo: string;
}

interface PersonaDoc {
  id_persona: string;
  dni: string;
  nombres: string;
  apellido_paterno: string;
  apellido_materno: string;
  nombre_completo: string;
}

interface JwtPayload {
  sub: string;
  rol: string;
  username: string;
}

@Injectable()
export class AuthService {
  private readonly accessTtl: string;
  private readonly refreshTtl: string;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reniec: ReniecClient,
    private readonly audit: AuditService,
    @Inject(MONGO_DB) private readonly db: Db,
  ) {
    this.accessTtl = config.get<string>("JWT_ACCESS_TTL") ?? JWT_ACCESS_TTL_DEFAULT;
    this.refreshTtl = config.get<string>("JWT_REFRESH_TTL") ?? JWT_REFRESH_TTL_DEFAULT;
  }

  private get usuarios(): Collection<UsuarioDoc> {
    return this.db.collection<UsuarioDoc>("usuarios");
  }
  private get personas(): Collection<PersonaDoc> {
    return this.db.collection<PersonaDoc>("personas");
  }

  async getAuthStatus(): Promise<AuthStatusDto> {
    const count = await this.usuarios.countDocuments({});
    return { has_users: count > 0, requires_setup: count === 0 };
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    const user = await this.usuarios.findOne({ username });
    if (!user) {
      throw AppError.internal("Credenciales invalidas.");
    }
    if (user.activo !== 1) {
      throw AppError.internal("Credenciales invalidas.");
    }
    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) {
      throw AppError.internal("Credenciales invalidas.");
    }
    return this.buildAuthResponse(user);
  }

  async refresh(refreshToken: string): Promise<{ accessToken: string; refreshToken: string }> {
    let payload: JwtPayload;
    try {
      payload = await this.jwt.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      });
    } catch {
      throw AppError.internal("Refresh token invalido o expirado.");
    }
    const user = await this.usuarios.findOne({ id_usuario: payload.sub });
    if (!user || user.activo !== 1) {
      throw AppError.internal("Sesion invalidada.");
    }
    const access = await this.signAccess({
      sub: user.id_usuario,
      rol: user.rol,
      username: user.username,
    });
    const refresh = await this.signRefresh({
      sub: user.id_usuario,
      rol: user.rol,
      username: user.username,
    });
    return { accessToken: access, refreshToken: refresh };
  }

  async logout(): Promise<{ ok: true }> {
    return { ok: true };
  }

  async session(user: AuthenticatedUser): Promise<UsuarioDto | null> {
    const doc = await this.usuarios.findOne({ id_usuario: user.id_usuario });
    if (!doc) return null;
    return this.toUsuarioDto(doc);
  }

  async bootstrap(
    username: string,
    password: string,
    dni: string,
    nombres?: string,
    apellidoPaterno?: string,
    apellidoMaterno?: string,
  ): Promise<UsuarioDto> {
    const count = await this.usuarios.countDocuments({});
    if (count > 0) {
      throw AppError.internal("El bootstrap solo esta disponible sin usuarios.");
    }
    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    const id_persona = `persona-${dni}`;
    const nombreCompleto =
      `${nombres ?? ""} ${apellidoPaterno ?? ""} ${apellidoMaterno ?? ""}`.trim();
    await this.personas.updateOne(
      { id_persona },
      {
        $set: {
          id_persona,
          dni,
          nombres: nombres ?? "",
          apellido_paterno: apellidoPaterno ?? "",
          apellido_materno: apellidoMaterno ?? "",
          nombre_completo: nombreCompleto,
        },
      },
      { upsert: true },
    );
    const id_usuario = `usuario-${username.toLowerCase()}`;
    const doc: UsuarioDoc = {
      id_usuario,
      username,
      password_hash,
      rol: "superuser",
      activo: 1,
      persona_id: id_persona,
      dni,
      nombre_completo: nombreCompleto,
    };
    await this.usuarios.insertOne(doc);
    const created = await this.usuarios.findOne({ id_usuario });
    if (!created) {
      throw AppError.internal("No se pudo recuperar el usuario creado.");
    }
    const actor = { id_usuario, username, rol: "superuser" };
    await this.audit.writeUserAudit(actor, "usuario.create", { ...actor });
    return this.toUsuarioDto(created);
  }

  async bootstrapReniecDni(numero: string): Promise<ReniecDniLookupResult> {
    const count = await this.usuarios.countDocuments({});
    if (count > 0) {
      throw AppError.internal("El bootstrap solo esta disponible sin usuarios.");
    }
    return this.reniec.consultar(numero);
  }

  async ensureUsuario(
    username: string,
    password: string,
    dni: string,
    rol: string,
    personaId: string,
    nombreCompleto: string,
  ): Promise<UsuarioDto> {
    const password_hash = await argon2.hash(password, { type: argon2.argon2id });
    const doc: UsuarioDoc = {
      id_usuario: `usuario-${username.toLowerCase()}`,
      username,
      password_hash,
      rol,
      activo: 1,
      persona_id: personaId,
      dni,
      nombre_completo: nombreCompleto,
    };
    await this.usuarios.insertOne(doc);
    const created = await this.usuarios.findOne({ id_usuario: doc.id_usuario });
    if (!created) throw AppError.internal("No se pudo crear el usuario.");
    return this.toUsuarioDto(created);
  }

  async applyUpdate(
    targetId: string,
    changes: Partial<Pick<UsuarioDoc, "rol" | "activo">>,
  ): Promise<void> {
    await this.usuarios.updateOne({ id_usuario: targetId }, { $set: changes });
  }

  async setPersonaRef(userId: string, personaId: string | null, dni: string | null): Promise<void> {
    await this.usuarios.updateOne({ id_usuario: userId }, { $set: { persona_id: personaId, dni } });
  }

  async findById(id: string): Promise<UsuarioDto | null> {
    const doc = await this.usuarios.findOne({ id_usuario: id });
    return doc ? this.toUsuarioDto(doc) : null;
  }

  async findByDni(dni: string): Promise<UsuarioDoc | null> {
    return this.usuarios.findOne({ dni });
  }

  private async buildAuthResponse(user: UsuarioDoc): Promise<AuthResponse> {
    const payload = { sub: user.id_usuario, rol: user.rol, username: user.username };
    return {
      user: this.toUsuarioDto(user),
      accessToken: await this.signAccess(payload),
      refreshToken: await this.signRefresh(payload),
    };
  }

  private signAccess(payload: JwtPayload): Promise<string> {
    // @nestjs/jwt@11 tiene tipos estrictos (StringValue literal); escape controlado.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: this.accessTtl,
    } as any);
  }

  private signRefresh(payload: JwtPayload): Promise<string> {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return this.jwt.signAsync(payload, {
      secret: this.config.getOrThrow<string>("JWT_REFRESH_SECRET"),
      expiresIn: this.refreshTtl,
    } as any);
  }

  private toUsuarioDto(doc: UsuarioDoc): UsuarioDto {
    return {
      id_usuario: doc.id_usuario,
      username: doc.username,
      nombre_completo: doc.nombre_completo,
      rol: doc.rol,
      activo: doc.activo,
      persona_id: doc.persona_id,
      dni: doc.dni,
    };
  }
}
