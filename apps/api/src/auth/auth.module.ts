import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { LoginRateLimiterService } from "./login-rate-limiter.service";
import { ReniecClient } from "../infra/http/reniec.client";
import { MongoModule } from "../infra/mongo/mongo.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ConfigModule, MongoModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, LoginRateLimiterService, ReniecClient],
  exports: [AuthService, LoginRateLimiterService, ReniecClient],
})
export class AuthModule {}
