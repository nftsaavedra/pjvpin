import { Module } from "@nestjs/common";
import { GradosController } from "./grados.controller";
import { GradosService } from "./grados.service";
import { GradosRepository } from "./grados.repository";

@Module({
  controllers: [GradosController],
  providers: [GradosService, GradosRepository],
  exports: [GradosService],
})
export class GradosModule {}
