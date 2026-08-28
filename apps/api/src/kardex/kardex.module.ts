import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { KardexService } from "./kardex.service";

@Module({
  imports: [MongoModule],
  providers: [KardexService],
  exports: [KardexService],
})
export class KardexModule {}
