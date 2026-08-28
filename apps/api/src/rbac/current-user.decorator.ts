import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export interface AuthenticatedUser {
  id_usuario: string;
  username: string;
  rol: string;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser | null => {
    const req = ctx.switchToHttp().getRequest();
    return req.user ?? null;
  },
);
