import { Inject, Injectable } from "@nestjs/common";
import type { Db } from "mongodb";
import { MONGO_DB } from "../../infra/mongo/mongo.module";
import { AppError } from "../../infra/errors/app-error";

/**
 * Union de nombres de PK publica (`id_<entidad>`) tolerados por la
 * coleccion destino. Toleramos la inconsistencia historica Rust donde
 * algunas PK viven en `id_*` y otras en `_id`. Buscar en TODOS los campos
 * evita falsos negativos para FK probes en servicios que reutilizan el
 * helper para validar referencias cruzadas.
 */
export const ENTITY_ID_FIELDS = [
  "id_proyecto",
  "id_org_unit",
  "id_financiamiento",
  "id_patente",
  "id_equipamiento",
  "id_grupo",
  "id_evento",
  "id_grado",
  "id_catalogo",
  "id_persona",
  "id_publicacion",
] as const;

/**
 * Servicio transversal de comprobacion de existencia de entidades (FK
 * probe polimorfico). Consolida el helper `ensureEntityExists` que estaba
 * duplicado en `proyectos.service.ts` y `recursos.service.ts` con la misma
 * logica de union probe sobre los nombres de PK publica. Antes vivia en
 * el repositorio de recursos (`RecursosRepository.entityExists`); ahora
 * es una dependencia de infraestructura compartida.
 */
@Injectable()
export class EntityRefsService {
  constructor(@Inject(MONGO_DB) private readonly db: Db) {}

  async exists(collection: string, id: string): Promise<boolean> {
    const doc = await this.db
      .collection(collection)
      .findOne({ $or: ENTITY_ID_FIELDS.map((c) => ({ [c]: id })) });
    return doc != null;
  }

  async assertExists(collection: string, id: string, label: string): Promise<void> {
    const ok = await this.exists(collection, id);
    if (!ok) {
      throw AppError.notFound(`${label} no encontrado.`);
    }
  }
}
