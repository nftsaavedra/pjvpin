import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { CatalogosRepository, type CatalogoDoc } from "../catalogos.repository";
import type { CatalogoItemDto, ReimportarVocabResult } from "../dto/catalogos.dto";
import { VOCAB_SEED, VOCAB_SEED_ESQUEMAS } from "./vocab-seed";

const ESQUEMAS_CONOCIDOS = VOCAB_SEED_ESQUEMAS as unknown as string[];

/**
 * Re-importacion de vocabularios SKOS: borra los items del esquema en la
 * BD y reinserta el set embebido (`VOCAB_SEED`). Idempotente para un
 * esquema; los catalogos internos legacy (sin `esquema`) no se tocan.
 */
@Injectable()
export class VocabularioService {
  private readonly logger = new Logger(VocabularioService.name);

  constructor(private readonly repo: CatalogosRepository) {}

  async listarEsquemas(): Promise<string[]> {
    const esquemas = await this.repo.listEsquemasVocabulario();
    return Array.from(new Set([...ESQUEMAS_CONOCIDOS, ...esquemas])).sort();
  }

  async listarItems(esquema: string, padreCodigo: string | undefined): Promise<CatalogoItemDto[]> {
    const docs = await this.repo.listItemsByEsquema(esquema, padreCodigo);
    return docs.map((d) => this.toDto(d));
  }

  async reimportar(esquema: string): Promise<ReimportarVocabResult> {
    const entries = VOCAB_SEED.filter((e) => e.esquema === esquema);
    if (entries.length === 0) {
      throw new BadRequestException(`Esquema de vocabulario no soportado: ${esquema}`);
    }

    await this.repo.deleteByEsquema(esquema);
    let recargados = 0;
    for (const e of entries) {
      const doc: CatalogoDoc = {
        id: `catalogo-${e.esquema}-${e.codigo_interno}`,
        tipo: e.esquema,
        codigo: e.codigo_interno,
        codigo_skos: e.codigo_skos,
        nombre: e.nombre,
        esquema: e.esquema,
        padre_codigo: e.padre_codigo ?? undefined,
        nivel: e.nivel,
        editable: 0,
        activo: 1,
      };
      await this.repo.insert(doc);
      recargados += 1;
    }

    this.logger.log(`reimportar vocabulario ${esquema}: ${recargados} items`);
    return { ok: true, esquema, recargados };
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
      padre_codigo: doc.padre_codigo,
    };
  }
}