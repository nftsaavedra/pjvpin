import { Module } from "@nestjs/common";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { JwtStrategy } from "./jwt.strategy";
import { ReniecClient } from "../infra/http/reniec.client";
import { MongoModule } from "../infra/mongo/mongo.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ConfigModule, PassportModule, MongoModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, ReniecClient],
  exports: [AuthService, ReniecClient],
})
export class AuthModule {}
