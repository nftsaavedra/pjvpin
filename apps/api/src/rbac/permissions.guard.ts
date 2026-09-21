import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { PERMISSION_KEY } from "./require-permission.decorator";
import { AppPermission } from "./permissions.enum";
import { roleHasPermission } from "./role-matrix";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<AppPermission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required) return true;

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user || typeof user.rol !== "string") {
      throw new UnauthorizedException("Autenticacion requerida.");
    }
    if (!roleHasPermission(user.rol, required)) {
      throw new ForbiddenException("No tiene permisos para realizar esta operacion.");
    }
    return true;
  }
}
