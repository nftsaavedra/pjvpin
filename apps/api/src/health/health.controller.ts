import { Controller, Get } from "@nestjs/common";
import { UsuariosRepository } from "../usuarios/usuarios.repository";
import type { AuthStatusDto } from "../auth/dto/auth.response";

@Controller("health")
export class HealthController {
  constructor(private readonly usuarios: UsuariosRepository) {}

  @Get()
  async check(): Promise<AuthStatusDto & { version: string; ok: boolean }> {
    const count = await this.usuarios.count();
    return {
      ok: true,
      has_users: count > 0,
      requires_setup: count === 0,
      version: "0.1.0",
    };
  }

  @Get("ping")
  ping(): { ok: true; at: string } {
    return { ok: true, at: new Date().toISOString() };
  }
}
