import { Module } from "@nestjs/common";
import { GeoController } from "./geo.controller";
import { GeoService } from "./geo.service";
import { GeoRepository } from "./geo.repository";

@Module({
  controllers: [GeoController],
  providers: [GeoService, GeoRepository],
  exports: [GeoService],
})
export class GeoModule {}
