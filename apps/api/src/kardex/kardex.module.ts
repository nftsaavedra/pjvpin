import { Module } from "@nestjs/common";
import { KardexService } from "./kardex.service";

@Module({
  providers: [KardexService],
  exports: [KardexService],
})
export class KardexModule {}
