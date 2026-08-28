import { Module } from "@nestjs/common";
import { InvestigadoresService } from "./investigadores.service";
import { InvestigadoresController } from "./investigadores.controller";
import { InvestigadoresRepository } from "./investigadores.repository";
import { ExternalHttpModule } from "../external-http/external-http.module";
import { RenacytModule } from "../renacyt/renacyt.module";
import { KardexModule } from "../kardex/kardex.module";
import { PureModule } from "../pure/pure.module";
import { PeruCrisModule } from "../perucris/perucris.module";
import { MongoModule } from "../infra/mongo/mongo.module";

@Module({
  imports: [
    MongoModule,
    ExternalHttpModule,
    RenacytModule,
    KardexModule,
    PureModule,
    PeruCrisModule,
  ],
  controllers: [InvestigadoresController],
  providers: [InvestigadoresService, InvestigadoresRepository],
  exports: [InvestigadoresService, InvestigadoresRepository],
})
export class InvestigadoresModule {}
