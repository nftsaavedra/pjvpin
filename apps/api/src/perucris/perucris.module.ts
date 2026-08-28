import { Module } from "@nestjs/common";
import { PeruCrisService } from "./perucris.service";
import { PeruCrisController } from "./perucris.controller";
import { ExternalHttpModule } from "../external-http/external-http.module";

@Module({
  imports: [ExternalHttpModule],
  controllers: [PeruCrisController],
  providers: [PeruCrisService],
  exports: [PeruCrisService],
})
export class PeruCrisModule {}
