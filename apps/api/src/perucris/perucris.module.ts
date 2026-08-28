import { Module } from "@nestjs/common";
import { PeruCrisService } from "./perucris.service";
import { PeruCrisController } from "./perucris.controller";
import { ExternalHttpModule } from "../external-http/external-http.module";
import { MongoModule } from "../infra/mongo/mongo.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ExternalHttpModule, MongoModule, AuditModule],
  controllers: [PeruCrisController],
  providers: [PeruCrisService],
  exports: [PeruCrisService],
})
export class PeruCrisModule {}
