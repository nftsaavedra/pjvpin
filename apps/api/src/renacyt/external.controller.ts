import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { RenacytService } from "./renacyt.service";
import { ReniecClient } from "../infra/http/reniec.client";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PermissionsGuard } from "../rbac/permissions.guard";
import { RequirePermission } from "../rbac/require-permission.decorator";
import { AppPermission } from "../rbac/permissions.enum";

/**
 * Conectores externos RENIEC (consulta DNI) y RENACYT (consulta formacion,
 * ficha). Los endpoints viven bajo `/external/*` para agrupar todos los
 * conectores a servicios externos (ver doc 06 §5, §13).
 */
@Controller("external")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ExternalReniecRenacytController {
  constructor(
    private readonly renacytService: RenacytService,
    private readonly reniecClient: ReniecClient,
  ) {}

  @Get("reniec/dni/:numero")
  @RequirePermission(AppPermission.InvestigadoresManage)
  async consultarReniec(@Param("numero") numero: string) {
    return this.reniecClient.consultar(numero);
  }

  @Get("renacyt/investigador/:codigoOId")
  @RequirePermission(AppPermission.InvestigadoresManage)
  async consultarInvestigador(@Param("codigoOId") codigoOId: string) {
    return this.renacytService.consultarInvestigador(codigoOId);
  }
}
