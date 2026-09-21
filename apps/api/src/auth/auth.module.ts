import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { ReniecClient } from "../infra/http/reniec.client";
import { MongoModule } from "../infra/mongo/mongo.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ConfigModule, MongoModule, AuditModule],
  controllers: [AuthController],
  providers: [AuthService, ReniecClient],
  exports: [AuthService, ReniecClient],
})
export class AuthModule {}
