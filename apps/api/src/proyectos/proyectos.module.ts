import { Module } from "@nestjs/common";
import { InvestigadoresModule } from "../investigadores/investigadores.module";
import { MongoModule } from "../infra/mongo/mongo.module";
import { UsuariosModule } from "../usuarios/usuarios.module";
import { InvestigadorProyectosController } from "./investigador-proyectos.controller";
import { ProyectosController } from "./proyectos.controller";
import { ProyectosRepository } from "./proyectos.repository";
import { ProyectosService } from "./proyectos.service";

@Module({
  imports: [MongoModule, UsuariosModule, InvestigadoresModule],
  controllers: [ProyectosController, InvestigadorProyectosController],
  providers: [ProyectosService, ProyectosRepository],
  exports: [ProyectosService, ProyectosRepository],
})
export class ProyectosModule {}
