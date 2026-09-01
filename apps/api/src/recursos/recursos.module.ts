import { Module } from "@nestjs/common";
import { InvestigadoresModule } from "../investigadores/investigadores.module";
import { MongoModule } from "../infra/mongo/mongo.module";
import { UsuariosModule } from "../usuarios/usuarios.module";
import { EquipamientosController } from "./equipamientos.controller";
import { FinanciamientosController } from "./financiamientos.controller";
import { PatentesController } from "./patentes.controller";
import { ProyectosRecursosController } from "./proyectos-recursos.controller";
import { RecursosRepository } from "./recursos.repository";
import { RecursosService } from "./recursos.service";

@Module({
  imports: [MongoModule, UsuariosModule, InvestigadoresModule],
  controllers: [
    PatentesController,
    EquipamientosController,
    FinanciamientosController,
    ProyectosRecursosController,
  ],
  providers: [RecursosService, RecursosRepository],
  exports: [RecursosService, RecursosRepository],
})
export class RecursosModule {}
