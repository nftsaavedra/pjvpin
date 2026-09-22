import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { VocabularioService } from "./vocabulario.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsGuard } from "../../rbac/permissions.guard";
import { RequirePermission } from "../../rbac/require-permission.decorator";
import { AppPermission } from "../../rbac/permissions.enum";
import { Audit } from "../../audit/audit.decorator";
import type { CatalogoItemDto, ReimportarVocabResult } from "../dto/catalogos.dto";

@Controller("vocabularios")
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class VocabularioController {
  constructor(private readonly service: VocabularioService) {}

  @Get()
  @RequirePermission(AppPermission.VocabulariosRead)
  async listar(): Promise<string[]> {
    return this.service.listarEsquemas();
  }

  @Get(":esquema/items")
  @RequirePermission(AppPermission.VocabulariosRead)
  async items(
    @Param("esquema") esquema: string,
    @Query("padre_codigo") padre_codigo?: string,
  ): Promise<CatalogoItemDto[]> {
    return this.service.listarItems(esquema, padre_codigo);
  }

  @Post(":esquema/reimportar")
  @RequirePermission(AppPermission.VocabulariosManage)
  @Audit({
    action: "vocabulario.reimport",
    targetType: "vocabulario",
    details: {
      from: "response",
      pick: (response) => {
        const r = response as { recargados?: number } | null;
        return r ? { recargados: r.recargados } : undefined;
      },
    },
  })
  async reimportar(@Param("esquema") esquema: string): Promise<ReimportarVocabResult> {
    return this.service.reimportar(esquema);
  }
}