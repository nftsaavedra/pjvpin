import { Module } from "@nestjs/common";
import { UsuariosController } from "./usuarios.controller";
import { UsuariosService } from "./usuarios.service";
import { UsuariosRepository } from "./usuarios.repository";
import { PersonasModule } from "../personas/personas.module";

@Module({
  imports: [PersonasModule],
  controllers: [UsuariosController],
  providers: [UsuariosService, UsuariosRepository],
  exports: [UsuariosService, UsuariosRepository],
})
export class UsuariosModule {}
