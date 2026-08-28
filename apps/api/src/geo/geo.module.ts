import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { GeoController } from "./geo.controller";
import { GeoService } from "./geo.service";
import { GeoRepository } from "./geo.repository";

@Module({
  imports: [MongoModule],
  controllers: [GeoController],
  providers: [GeoService, GeoRepository],
  exports: [GeoService, GeoRepository],
})
export class GeoModule {}
