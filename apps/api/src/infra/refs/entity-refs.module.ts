import { Module } from "@nestjs/common";
import { MongoModule } from "../mongo/mongo.module";
import { EntityRefsService } from "./entity-refs.service";

@Module({
  imports: [MongoModule],
  providers: [EntityRefsService],
  exports: [EntityRefsService],
})
export class EntityRefsModule {}
