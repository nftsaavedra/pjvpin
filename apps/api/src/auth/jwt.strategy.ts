import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { JWT_ACCESS_TTL_DEFAULT } from "../config/defaults";
import type { AuthenticatedUser } from "../rbac/current-user.decorator";

interface JwtPayload {
  sub: string;
  rol: string;
  username: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    return {
      id_usuario: payload.sub,
      username: payload.username,
      rol: payload.rol,
    };
  }
}

export const jwtAccessTtlFromEnv = (config: ConfigService): string =>
  config.get<string>("JWT_ACCESS_TTL") ?? JWT_ACCESS_TTL_DEFAULT;
