import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { ReniecClient } from "../infra/http/reniec.client";

@Module({
  imports: [
    ConfigModule,
    PassportModule,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      // @nestjs/jwt@11 tipifica expiresIn como StringValue literal; escape controlado.
      useFactory: (config: ConfigService): any => ({
        secret: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
        signOptions: { expiresIn: config.get<string>("JWT_ACCESS_TTL") ?? "15m" },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtAuthGuard, ReniecClient],
  exports: [AuthService, JwtAuthGuard],
})
export class AuthModule {}
