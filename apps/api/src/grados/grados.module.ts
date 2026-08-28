import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { GradosController } from "./grados.controller";
import { GradosService } from "./grados.service";
import { GradosRepository } from "./grados.repository";

@Module({
  imports: [MongoModule],
  controllers: [GradosController],
  providers: [GradosService, GradosRepository],
  exports: [GradosService],
})
export class GradosModule {}
