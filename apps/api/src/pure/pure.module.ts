import { Module } from "@nestjs/common";
import { PureService } from "./pure.service";
import { InvestigadoresPureController, PureController } from "./pure.controller";
import { ExternalHttpModule } from "../external-http/external-http.module";
import { MongoModule } from "../infra/mongo/mongo.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [ExternalHttpModule, MongoModule, AuditModule],
  controllers: [PureController, InvestigadoresPureController],
  providers: [PureService],
  exports: [PureService],
})
export class PureModule {}
