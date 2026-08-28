import { Injectable } from "@nestjs/common";
import {
  RenacytBusquedaExitoso,
  RenacytClient,
  type RenacytLookupResult,
} from "../infra/http/renacyt.client";

@Injectable()
export class RenacytService {
  constructor(private readonly client: RenacytClient) {}

  async consultarInvestigador(codigoOId: string): Promise<RenacytLookupResult> {
    return this.client.consultarInvestigador(codigoOId);
  }

  async buscarPorDni(dni: string): Promise<RenacytBusquedaExitoso | null> {
    return this.client.buscarPorDni(dni);
  }

  async descargarConstancia(codigoRegistro: string): Promise<Buffer> {
    return this.client.descargarConstancia(codigoRegistro);
  }
}
