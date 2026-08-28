import { Module } from "@nestjs/common";
import { PureService } from "./pure.service";
import { InvestigadoresPureController, PureController } from "./pure.controller";
import { ExternalHttpModule } from "../external-http/external-http.module";

@Module({
  imports: [ExternalHttpModule],
  controllers: [PureController, InvestigadoresPureController],
  providers: [PureService],
  exports: [PureService],
})
export class PureModule {}
