import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { InvestigadoresPublicacionesController } from "./investigadores-publicaciones.controller";
import { PublicacionesController } from "./publicaciones.controller";
import { PublicacionesRepository } from "./publicaciones.repository";
import { PublicacionesService } from "./publicaciones.service";
import { ProyectosSoftwareController } from "./proyectos-software.controller";

@Module({
  imports: [MongoModule],
  controllers: [
    PublicacionesController,
    InvestigadoresPublicacionesController,
    ProyectosSoftwareController,
  ],
  providers: [PublicacionesService, PublicacionesRepository],
  exports: [PublicacionesService, PublicacionesRepository],
})
export class PublicacionesModule {}