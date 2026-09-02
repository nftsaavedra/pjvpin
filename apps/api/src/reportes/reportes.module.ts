import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";
import { ReportesExportRepository } from "./repository-export";
import { ReportesIntegralRepository } from "./repository-integral";
import { ReportesMasterlistRepository } from "./repository-masterlist";
import { CerifModule } from "../cerif/cerif.module";
import { AuditModule } from "../audit/audit.module";

@Module({
  imports: [MongoModule, CerifModule, AuditModule],
  controllers: [ReportesController],
  providers: [
    ReportesService,
    ReportesExportRepository,
    ReportesIntegralRepository,
    ReportesMasterlistRepository,
  ],
})
export class ReportesModule {}
