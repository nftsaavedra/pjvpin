import { Module } from "@nestjs/common";
import { InvestigadoresService } from "./investigadores.service";
import { InvestigadoresController } from "./investigadores.controller";
import { InvestigadoresRepository } from "./investigadores.repository";
import { ExternalHttpModule } from "../external-http/external-http.module";
import { RenacytModule } from "../renacyt/renacyt.module";
import { KardexModule } from "../kardex/kardex.module";

@Module({
  imports: [ExternalHttpModule, RenacytModule, KardexModule],
  controllers: [InvestigadoresController],
  providers: [InvestigadoresService, InvestigadoresRepository],
  exports: [InvestigadoresService, InvestigadoresRepository],
})
export class InvestigadoresModule {}
