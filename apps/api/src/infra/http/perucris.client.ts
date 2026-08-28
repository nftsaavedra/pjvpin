import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../errors/app-error";
import { sanitizeExternalDetail } from "../utils/sanitize";
import {
  DEFAULT_PERUCRIS_API_BASE_URL,
  DEFAULT_PERUCRIS_PUBLIC_API_BASE_URL,
} from "../../config/defaults";

export interface PeruCrisFieldValue {
  value: string;
  language?: string | null;
  authority?: string | null;
  confidence?: number | null;
  place?: number | null;
}

export interface PeruCrisMetadata {
  keys: Record<string, PeruCrisFieldValue[]>;
}

export interface PeruCrisHit {
  uuid: string;
  handle?: string | null;
  last_modified?: string | null;
  name?: string | null;
  metadata: PeruCrisMetadata;
}

interface IndexableObjectEmbedded {
  indexable_object: PeruCrisHit;
}

interface SearchObject {
  _embedded: IndexableObjectEmbedded;
}

interface SearchResultObjects {
  objects: SearchObject[];
}

interface SearchResultEmbedded {
  _embedded: SearchResultObjects;
}

interface SearchEmbedded {
  searchResult: SearchResultEmbedded;
}

interface SearchResponse {
  _embedded: SearchEmbedded;
}

function parseHit(raw: unknown): PeruCrisHit | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  const uuidVal = obj.uuid;
  if (typeof uuidVal !== "string" || uuidVal.length === 0) return null;
  const md = obj.metadata;
  const keys: Record<string, PeruCrisFieldValue[]> = {};
  if (md && typeof md === "object") {
    for (const [k, v] of Object.entries(md as Record<string, unknown>)) {
      if (Array.isArray(v)) {
        keys[k] = v
          .filter((entry): entry is Record<string, unknown> => !!entry && typeof entry === "object")
          .map((entry) => ({
            value: typeof entry.value === "string" ? entry.value : "",
            language: typeof entry.language === "string" ? entry.language : null,
            authority: typeof entry.authority === "string" ? entry.authority : null,
            confidence: typeof entry.confidence === "number" ? entry.confidence : null,
            place: typeof entry.place === "number" ? entry.place : null,
          }));
      }
    }
  }
  return {
    uuid: uuidVal,
    handle: typeof obj.handle === "string" ? obj.handle : null,
    last_modified: typeof obj.lastModified === "string" ? obj.lastModified : null,
    name: typeof obj.name === "string" ? obj.name : null,
    metadata: { keys },
  };
}

@Injectable()
export class PeruCrisClient {
  private readonly logger = new Logger(PeruCrisClient.name);
  private readonly publicBaseUrl: string;

  constructor(_config: ConfigService) {
    this.publicBaseUrl =
      _config.get<string>("PJVPIN_PERUCRIS_PUBLIC_API_BASE_URL") ??
      DEFAULT_PERUCRIS_PUBLIC_API_BASE_URL;
    // privateBaseUrl (PJVPIN_PERUCRIS_API_BASE_URL) reservado para el push
    // CERIF que aterriza en Bloque F3 junto al port de cerif.rs.
    void DEFAULT_PERUCRIS_API_BASE_URL;
  }

  /**
   * Busqueda libre por query en el HAL publico. Devuelve hasta `size` hits.
   * Filtra por entity_type en la capa de servicio (el HAL no acepta filtros
   * discriminantes por URL).
   */
  async searchByQuery(query: string, size = 5): Promise<PeruCrisHit[]> {
    const url = `${this.publicBaseUrl.replace(/\/+$/, "")}/discover/search/objects`;
    const params = new URLSearchParams({
      query,
      dsoType: "ITEM",
      size: String(size),
    });
    return this.getJson(`${url}?${params.toString()}`);
  }

  /**
   * Busqueda por scope (`configuration` + `scope`) usada por el importador
   * para enumerar las publicaciones de una OrgUnit via su perucris_uuid.
   */
  async searchByScope(configuration: string, scope: string, size = 100): Promise<PeruCrisHit[]> {
    const url = `${this.publicBaseUrl.replace(/\/+$/, "")}/discover/search/objects`;
    const params = new URLSearchParams({
      configuration,
      scope,
      dsoType: "ITEM",
      size: String(size),
    });
    return this.getJson(`${url}?${params.toString()}`);
  }

  /**
   * Lookup directo por UUID canonico (mas confiable que la busqueda por
   * identificador cuando ya tenemos el id PeruCRIS).
   */
  async findByUuid(uuid: string): Promise<PeruCrisHit | null> {
    const url = `${this.publicBaseUrl.replace(/\/+$/, "")}/dso/find`;
    const params = new URLSearchParams({ uuid });
    const res = await fetch(`${url}?${params.toString()}`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.external(
        `PeruCRIS dso/find respondio ${res.status} para ${uuid}: ${sanitizeExternalDetail(text)}`,
      );
    }
    const raw = (await res.json()) as unknown;
    return parseHit(raw);
  }

  /**
   * Push CERIF. **Stub pospuesto a F3** — `cerif.rs` (1 145 lineas) define
   * el payload completo (OrgUnit/Person/Publication/Project/Patent). El
   * endpoint HTTP y la firma del metodo aterrizan en el Bloque F3 junto al
   * port del serializador. Mantenemos la constante `privateBaseUrl` y el
   * helper de parseo disponibles para esa fase.
   */
  // pushCerif(payload: unknown): Promise<{ status: number }> — pospuesto a F3.

  private async getJson(url: string): Promise<PeruCrisHit[]> {
    let res: Response;
    try {
      res = await fetch(url, { method: "GET", headers: { Accept: "application/json" } });
    } catch (err) {
      this.logger.error(
        `PeruCRIS ${url}: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external(`PeruCRIS fallo de transporte: ${sanitizeExternalDetail(url)}`);
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.external(
        `PeruCRIS respondio ${res.status} para ${sanitizeExternalDetail(url)}: ${sanitizeExternalDetail(text)}`,
      );
    }
    let body: SearchResponse;
    try {
      body = (await res.json()) as SearchResponse;
    } catch (err) {
      throw AppError.external(
        `PeruCRIS devolvio JSON invalido: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
    }
    return (body._embedded?.searchResult?._embedded?.objects ?? [])
      .map((o) => o._embedded.indexable_object)
      .filter((h): h is PeruCrisHit => !!h);
  }
}
