import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { CerifRepository } from "./cerif.repository";
import { CerifService } from "./cerif.service";

@Module({
  imports: [MongoModule],
  providers: [CerifService, CerifRepository],
  exports: [CerifService],
})
export class CerifModule {}
