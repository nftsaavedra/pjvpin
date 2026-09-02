import { Module } from "@nestjs/common";
import { MongoModule } from "../infra/mongo/mongo.module";
import { ReportesController } from "./reportes.controller";
import { ReportesService } from "./reportes.service";
import { ReportesExportRepository } from "./repository-export";
import { ReportesIntegralRepository } from "./repository-integral";

@Module({
  imports: [MongoModule],
  controllers: [ReportesController],
  providers: [ReportesService, ReportesExportRepository, ReportesIntegralRepository],
})
export class ReportesModule {}
