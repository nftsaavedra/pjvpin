import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { OcdeController } from "./ocde.controller";
import { OcdeService } from "./ocde.service";
import { OcdeRepository } from "./ocde.repository";

@Module({
  imports: [MongoModule],
  controllers: [OcdeController],
  providers: [OcdeService, OcdeRepository],
  exports: [OcdeService],
})
export class OcdeModule {}
