import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { EventosController } from "./eventos.controller";
import { EventosRepository } from "./eventos.repository";
import { EventosService } from "./eventos.service";
import { InvestigadoresEventosController } from "./investigadores-eventos.controller";

@Module({
  imports: [MongoModule],
  controllers: [EventosController, InvestigadoresEventosController],
  providers: [EventosService, EventosRepository],
  exports: [EventosService, EventosRepository],
})
export class EventosModule {}