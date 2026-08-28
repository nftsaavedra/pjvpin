import { Module } from "@nestjs/common";
import { InvestigadoresController } from "./investigadores.controller";
import { InvestigadoresService } from "./investigadores.service";
import { InvestigadoresRepository } from "./investigadores.repository";
import { ReniecClient } from "../infra/http/reniec.client";

@Module({
  controllers: [InvestigadoresController],
  providers: [InvestigadoresService, InvestigadoresRepository, ReniecClient],
  exports: [InvestigadoresService, InvestigadoresRepository],
})
export class InvestigadoresModule {}
