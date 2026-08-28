import { Module } from "@nestjs/common";
import { OrgUnitsController } from "./org-units.controller";
import { OrgUnitsService } from "./org-units.service";
import { OrgUnitsRepository } from "./org-units.repository";

@Module({
  controllers: [OrgUnitsController],
  providers: [OrgUnitsService, OrgUnitsRepository],
  exports: [OrgUnitsService],
})
export class OrgUnitsModule {}
