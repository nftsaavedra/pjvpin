import { Module } from "@nestjs/common";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";
import { UsuariosRepository } from "./usuarios.repository";
import { PersonasModule } from "../personas/personas.module";
import { RbacModule } from "../rbac/rbac.module";
import { MongoModule } from "../infra/mongo/mongo.module";
import { ExternalHttpModule } from "../external-http/external-http.module";

@Module({
  imports: [PersonasModule, RbacModule, MongoModule, ExternalHttpModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, UsuariosRepository],
  exports: [UsuariosService, UsuariosRepository],
})
export class UsuariosModule {}
