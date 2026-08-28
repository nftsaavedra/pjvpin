import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { VocabularioService } from "./vocabulario.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { PermissionsGuard } from "../../rbac/permissions.guard";
import { RequirePermission } from "../../rbac/require-permission.decorator";
import { AppPermission } from "../../rbac/permissions.enum";
import { CurrentUser, type AuthenticatedUser } from "../../rbac/current-user.decorator";
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
    @Query("padreCodigo") padreCodigo?: string,
  ): Promise<CatalogoItemDto[]> {
    return this.service.listarItems(esquema, padreCodigo);
  }

  @Post(":esquema/reimportar")
  @RequirePermission(AppPermission.VocabulariosManage)
  async reimportar(
    @Param("esquema") esquema: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ReimportarVocabResult> {
    return this.service.reimportar(esquema, actor);
  }
}
