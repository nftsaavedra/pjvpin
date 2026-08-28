import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { GruposController } from "./grupos.controller";
import { GruposService } from "./grupos.service";
import { GruposRepository } from "./grupos.repository";

@Module({
  imports: [MongoModule],
  controllers: [GruposController],
  providers: [GruposService, GruposRepository],
  exports: [GruposService],
})
export class GruposModule {}
