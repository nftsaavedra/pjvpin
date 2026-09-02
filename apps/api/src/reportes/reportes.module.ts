import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";
import { ReportesExportRepository } from "./repository-export";
import { ReportesIntegralRepository } from "./repository-integral";
import { ReportesMasterlistRepository } from "./repository-masterlist";

@Module({
  imports: [MongoModule],
  controllers: [ReportesController],
  providers: [
    ReportesService,
    ReportesExportRepository,
    ReportesIntegralRepository,
    ReportesMasterlistRepository,
  ],
})
export class ReportesModule {}
