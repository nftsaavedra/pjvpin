import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { RenacytService } from "./renacyt.service";
import { ReniecClient } from "../infra/http/reniec.client";

interface RenacytRefreshFormacionRequest {
  id_investigador: string;
}

/**
 * Conectores externos RENIEC (consulta DNI) y RENACYT (consulta formacion,
 * ficha, constancia). Los endpoints viven bajo `/external/*` para agrupar
 * todos los conectores a servicios externos (ver doc 06 §5, §13).
 */
@Controller("external")
export class ExternalReniecRenacytController {
  constructor(
    private readonly renacytService: RenacytService,
    private readonly reniecClient: ReniecClient,
  ) {}

  @Get("reniec/dni/:numero")
  async consultarReniec(@Param("numero") numero: string) {
    return this.reniecClient.consultar(numero);
  }

  @Get("renacyt/investigador/:codigoOId")
  async consultarInvestigador(@Param("codigoOId") codigoOId: string) {
    return this.renacytService.consultarInvestigador(codigoOId);
  }

  @Post("renacyt/refresh-formacion")
  async refreshFormacion(@Body() _body: RenacytRefreshFormacionRequest) {
    return { refreshed: 0 };
  }
}
