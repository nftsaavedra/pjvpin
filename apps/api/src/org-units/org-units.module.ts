import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { OrgUnitsController } from "./org-units.controller";
import { OrgUnitsService } from "./org-units.service";
import { OrgUnitsRepository } from "./org-units.repository";

@Module({
  imports: [MongoModule],
  controllers: [OrgUnitsController],
  providers: [OrgUnitsService, OrgUnitsRepository],
  exports: [OrgUnitsService],
})
export class OrgUnitsModule {}
