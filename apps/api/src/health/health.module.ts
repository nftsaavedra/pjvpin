import { Module } from "@nestjs/common";
import { HealthController } from "./health.controller";
import { UsuariosModule } from "../usuarios/usuarios.module";

@Module({
  imports: [UsuariosModule],
  controllers: [HealthController],
})
export class HealthModule {}
