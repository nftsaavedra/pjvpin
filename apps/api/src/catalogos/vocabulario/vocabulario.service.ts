import { Injectable, Logger } from "@nestjs/common";
import { CatalogosRepository, type CatalogoDoc } from "../catalogos.repository";
import { AuditService } from "../../audit/audit.service";
import type { AuthenticatedUser } from "../../rbac/current-user.decorator";
import type { CatalogoItemDto, ReimportarVocabResult } from "../dto/catalogos.dto";

const ESQUEMAS_CONOCIDOS = [
  "ocde_ford",
  "tipo_organizacion_concytec",
  "moneda_concytec",
  "idioma_iso_639_1",
  "estado_publicacion",
  "cuartil_jcr",
  "cuartil_scopus",
  "acceso_abierto",
  "tipo_patente_invencion",
  "tipo_software",
  "pais_iso_3166",
  "disciplina_concytec",
  "subdisciplina_concytec",
  "area_conocimiento_ocde",
  "estado_proyecto_sincyt",
] as const;

/**
 * Re-importacion de vocabularios SKOS.
 * En fase actual el API no carga el JSON embebido (Rust es dueno de BD);
 * el endpoint queda cableado con contrato y conteo; los items se obtendran
 * del backend Rust via sync cuando se cierre la transicion (fase H).
 * Para pruebas, usa una lista vacia y reporta 0 recargados.
 */
@Injectable()
export class VocabularioService {
  private readonly logger = new Logger(VocabularioService.name);

  constructor(
    private readonly repo: CatalogosRepository,
    private readonly audit: AuditService,
  ) {}

  async listarEsquemas(): Promise<string[]> {
    const esquemas = await this.repo.listEsquemasVocabulario();
    const known = ESQUEMAS_CONOCIDOS as unknown as string[];
    return Array.from(new Set([...known, ...esquemas])).sort();
  }

  async listarItems(esquema: string, padreCodigo: string | undefined): Promise<CatalogoItemDto[]> {
    const docs = await this.repo.listItemsByEsquema(esquema, padreCodigo);
    return docs.map((d) => this.toDto(d));
  }

  async reimportar(esquema: string, actor: AuthenticatedUser): Promise<ReimportarVocabResult> {
    this.logger.warn(`reimportar vocabulario ${esquema}: no-op en fase de transicion`);
    await this.audit.writeGenericAudit(
      { id_usuario: actor.id_usuario, username: actor.username, rol: actor.rol },
      "vocabulario.reimport",
      "vocabulario",
      esquema,
      JSON.stringify({ source: "api", note: "no-op fase transicion" }),
    );
    return { ok: true, esquema, recargados: 0 };
  }

  private toDto(doc: CatalogoDoc): CatalogoItemDto {
    return {
      id: doc.id,
      tipo: doc.tipo,
      codigo: doc.codigo,
      nombre: doc.nombre,
      descripcion: doc.descripcion,
      editable: doc.editable ?? 1,
      esquema: doc.esquema,
      padreCodigo: doc.padre_codigo,
    };
  }
}
