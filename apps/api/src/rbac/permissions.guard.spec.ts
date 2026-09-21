import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { PermissionsGuard } from "./permissions.guard";
import { AppPermission } from "./permissions.enum";

function makeGuard(required: AppPermission | undefined) {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(required),
  };
  const guard = new PermissionsGuard(reflector as never);
  const ctx = {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({
      getRequest: () => ({} as { user?: unknown }),
    }),
  } as unknown as Parameters<PermissionsGuard["canActivate"]>[0];
  return { guard, ctx };
}

function withUser<T extends object>(req: T) {
  return {
    getHandler: () => ({}),
    getClass: () => ({}),
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as Parameters<PermissionsGuard["canActivate"]>[0];
}

describe("PermissionsGuard", () => {
  it("returns true when no @RequirePermission is declared", () => {
    const { guard, ctx } = makeGuard(undefined);
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("throws UnauthorizedException when req.user is missing", () => {
    const { guard, ctx } = makeGuard(AppPermission.DashboardView);
    expect(() => guard.canActivate(ctx)).toThrow(UnauthorizedException);
  });

  it("throws ForbiddenException when user has empty rol (no matching permission)", () => {
    const { guard } = makeGuard(AppPermission.DashboardView);
    const req = withUser({ user: { id_usuario: "u", rol: "" as never } });
    expect(() => guard.canActivate(req)).toThrow(ForbiddenException);
  });

  it("throws ForbiddenException when role lacks the required permission", () => {
    const { guard } = makeGuard(AppPermission.ProyectosManage);
    const req = withUser({ user: { id_usuario: "u", rol: "consulta" } });
    expect(() => guard.canActivate(req)).toThrow(ForbiddenException);
  });

  it("returns true when role has the required permission", () => {
    const { guard } = makeGuard(AppPermission.ProyectosManage);
    const req = withUser({ user: { id_usuario: "u", rol: "operador" } });
    expect(guard.canActivate(req)).toBe(true);
  });
});
