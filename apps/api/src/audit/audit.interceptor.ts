import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable } from "rxjs";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";
import { AuditContextService } from "./audit-context.service";
import {
  AUDIT_METADATA_KEY,
  AUDIT_USER_METADATA_KEY,
} from "./audit.constants";
import {
  type AuditOptions,
  type AuditResolutionContext,
  type AuditTarget,
  type AuditUserOptions,
} from "./audit.decorator";
import { AuditService } from "./audit.service";

/**
 * Interceptor declarativo de auditoría. Lee metadata @Audit / @AuditUser
 * aplicada en el handler y delega en AuditService al retornar el handler
 * con éxito. La ejecución del handler se envuelve en AsyncLocalStorage para
 * que los servicios puedan enriquecer la entrada vía AuditContextService
 * (sin invocar AuditService directamente).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
    private readonly contextService: AuditContextService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const auditMeta = this.reflector.getAllAndOverride<AuditOptions | undefined>(
      AUDIT_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );
    const auditUserMeta = this.reflector.getAllAndOverride<AuditUserOptions | undefined>(
      AUDIT_USER_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!auditMeta && !auditUserMeta) {
      return next.handle();
    }

    const httpCtx = context.switchToHttp();
    const req = httpCtx.getRequest();
    const params = (req.params ?? {}) as Record<string, string>;
    const body = req.body as unknown;
    const user = (req.user ?? null) as AuthenticatedUser | null;

    return new Observable((observer) => {
      this.contextService.run({}, () => {
        next.handle().subscribe({
          next: (response: unknown) => {
            observer.next(response);
            observer.complete();
            void this.dispatch({
              options: auditMeta,
              userMeta: auditUserMeta,
              response,
              params,
              body,
              user,
            }).catch((err) => {
              this.logger.error(
                `Fallo al escribir auditoría: ${err instanceof Error ? err.message : String(err)}`,
              );
            });
          },
          error: (err) => observer.error(err),
          complete: () => observer.complete(),
        });
      });
    });
  }

  private async dispatch(args: {
    options: AuditOptions | undefined;
    userMeta: AuditUserOptions | undefined;
    response: unknown;
    params: Record<string, string>;
    body: unknown;
    user: AuthenticatedUser | null;
  }): Promise<void> {
    const { options, userMeta, response, params, body, user } = args;
    const buffer = this.contextService.get();

    if (userMeta) {
      const actor = resolveActor(user, userMeta.actor, response);
      const target = resolveUserTarget(response);
      if (!actor || !target) return;
      await this.auditService.writeUserAudit(
        { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
        userMeta.action,
        target,
      );
      return;
    }

    if (!options) return;

    if (options.deferToJob?.(response)) return;

    const actor = resolveActor(user, options.actor, response);
    if (!actor) return;

    const ctx: AuditResolutionContext = {
      params,
      body,
      response,
      actor,
    };
    const targetId = resolveTargetId(options.targetId, ctx, buffer);
    if (targetId === null) return;
    const details = resolveDetails(options.details, ctx, buffer);

    await this.auditService.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      options.action,
      options.targetType,
      targetId,
      details,
    );
  }
}

function resolveActor(
  user: AuthenticatedUser | null,
  option: { from: "response" } | undefined,
  response: unknown,
): AuthenticatedUser | null {
  if (option?.from === "response") {
    return extractUserFromResponse(response);
  }
  return user;
}

function extractUserFromResponse(response: unknown): AuthenticatedUser | null {
  if (!response || typeof response !== "object") return null;
  const obj = response as Record<string, unknown>;
  const id = obj.id_usuario;
  const username = obj.username;
  const rol = obj.rol;
  if (typeof id !== "string" || typeof username !== "string" || typeof rol !== "string") {
    return null;
  }
  return { id_usuario: id, username, rol };
}

function resolveUserTarget(
  response: unknown,
): { id_usuario: string; username: string; rol: string } | null {
  const user = extractUserFromResponse(response);
  return user;
}

function resolveTargetId(
  spec: AuditTarget | undefined,
  ctx: AuditResolutionContext,
  buffer: ReturnType<AuditContextService["get"]>,
): string | null {
  const effective: AuditTarget | undefined =
    buffer?.targetId !== undefined
      ? { from: "literal", value: buffer.targetId }
      : spec ?? { from: "param", name: "id" };

  switch (effective.from) {
    case "literal":
      return effective.value;
    case "param":
      return ctx.params[effective.name ?? "id"] ?? null;
    case "body":
      return readPath(ctx.body, effective.path);
    case "response":
      return readPath(ctx.response, effective.field);
    case "context":
      return buffer?.targetId ?? null;
    case "compose":
      return effective.fn(ctx);
  }
}

function resolveDetails(
  spec: AuditOptions["details"],
  ctx: AuditResolutionContext,
  buffer: ReturnType<AuditContextService["get"]>,
): string | undefined {
  if (!spec) return buffer?.detailsJson;
  if (typeof spec === "string") return spec;
  if ("static" in spec) return spec.static;
  if ("from" in spec && spec.from === "context") return buffer?.detailsJson;
  if ("from" in spec && spec.from === "response") {
    const picked = spec.pick(ctx.response);
    return picked ? JSON.stringify(picked) : buffer?.detailsJson;
  }
  if ("fn" in spec) {
    const picked = spec.fn(ctx);
    return picked ? JSON.stringify(picked) : buffer?.detailsJson;
  }
  return buffer?.detailsJson;
}

function readPath(source: unknown, path: string): string | null {
  if (source === null || source === undefined) return null;
  const segments = path.split(".");
  let current: unknown = source;
  for (const segment of segments) {
    if (current === null || current === undefined) return null;
    if (typeof current !== "object") return null;
    current = (current as Record<string, unknown>)[segment];
  }
  return typeof current === "string" || typeof current === "number" ? String(current) : null;
}
