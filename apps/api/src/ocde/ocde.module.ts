import { Module } from "@nestjs/common";
import { OcdeController } from "./ocde.controller";
import { OcdeService } from "./ocde.service";
import { OcdeRepository } from "./ocde.repository";

@Module({
  controllers: [OcdeController],
  providers: [OcdeService, OcdeRepository],
  exports: [OcdeService],
})
export class OcdeModule {}
