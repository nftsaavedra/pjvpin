import { Module } from "@nestjs/common";
import { ReniecClient } from "../infra/http/reniec.client";
import { RenacytClient } from "../infra/http/renacyt.client";
import { JobRegistry } from "./job-registry.service";

/**
 * Modulo transversal de HTTP externo. Provee los clientes a RENIEC/RENACYT
 * y el registro de jobs asincronos. Otros modulos (investigadores, pure,
 * perucris) importan este modulo para consumir los servicios.
 */
@Module({
  providers: [ReniecClient, RenacytClient, JobRegistry],
  exports: [ReniecClient, RenacytClient, JobRegistry],
})
export class ExternalHttpModule {}
