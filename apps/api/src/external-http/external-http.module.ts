import { Module } from "@nestjs/common";
import { ReniecClient } from "../infra/http/reniec.client";
import { RenacytClient } from "../infra/http/renacyt.client";
import { PureClient } from "../infra/http/pure.client";
import { PeruCrisClient } from "../infra/http/perucris.client";
import { JobRegistry } from "./job-registry.service";

/**
 * Modulo transversal de HTTP externo. Provee los clientes a RENIEC/RENACYT/
 * Pure/PeruCRIS y el registro de jobs asincronos. Otros modulos (investigadores,
 * pure, perucris) importan este modulo para consumir los servicios.
 */
@Module({
  providers: [ReniecClient, RenacytClient, PureClient, PeruCrisClient, JobRegistry],
  exports: [ReniecClient, RenacytClient, PureClient, PeruCrisClient, JobRegistry],
})
export class ExternalHttpModule {}
