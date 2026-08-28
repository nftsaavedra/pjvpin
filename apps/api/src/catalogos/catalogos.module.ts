import { Module } from "@nestjs/common";
import { CatalogosController } from "./catalogos.controller";
import { CatalogosService } from "./catalogos.service";
import { CatalogosRepository } from "./catalogos.repository";
import { VocabularioController } from "./vocabulario/vocabulario.controller";
import { VocabularioService } from "./vocabulario/vocabulario.service";
import { UsuariosModule } from "../usuarios/usuarios.module";
import { MongoModule } from "../infra/mongo/mongo.module";

@Module({
  imports: [UsuariosModule, MongoModule],
  controllers: [CatalogosController, VocabularioController],
  providers: [CatalogosService, CatalogosRepository, VocabularioService],
})
export class CatalogosModule {}
