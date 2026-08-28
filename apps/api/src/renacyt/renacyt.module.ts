import { Module } from "@nestjs/common";
import { ExternalHttpModule } from "../external-http/external-http.module";
import { RenacytService } from "./renacyt.service";
import { ExternalReniecRenacytController } from "./external.controller";

@Module({
  imports: [ExternalHttpModule],
  controllers: [ExternalReniecRenacytController],
  providers: [RenacytService],
  exports: [RenacytService],
})
export class RenacytModule {}
