import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { SyncController } from "./sync.controller";
import { SyncService } from "./sync.service";
import { SyncRepository } from "./sync.repository";

@Module({
  imports: [MongoModule],
  controllers: [SyncController],
  providers: [SyncService, SyncRepository],
})
export class SyncModule {}
