import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

interface JwtPayload {
  sub: string;
  rol: string;
  username: string;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
    const header = req.headers["authorization"] ?? req.headers["Authorization"];
    const token = typeof header === "string" ? header.replace(/^Bearer\s+/i, "") : null;
    if (!token) throw new UnauthorizedException("Token de acceso ausente.");
    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      req.user = {
        id_usuario: payload.sub,
        username: payload.username,
        rol: payload.rol,
      };
      return true;
    } catch {
      throw new UnauthorizedException("Token de acceso invalido o expirado.");
    }
  }
}
