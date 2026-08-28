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
  private readonly privateBaseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.publicBaseUrl =
      config.get<string>("PJVPIN_PERUCRIS_PUBLIC_API_BASE_URL") ??
      DEFAULT_PERUCRIS_PUBLIC_API_BASE_URL;
    this.privateBaseUrl =
      config.get<string>("PJVPIN_PERUCRIS_API_BASE_URL") ?? DEFAULT_PERUCRIS_API_BASE_URL;
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
   * Push CERIF. **Stub**: la implementacion completa del push aterriza en
   * Bloque F3 cuando se porte `cerif.rs` (1 145 lineas). Aqui dejamos
   * el endpoint HTTP con auth y la firma del metodo; los argumentos
   * llegaran via el body.
   */
  async pushCerif(payload: unknown): Promise<{ status: number }> {
    const apiKey = this.config.get<string>("PJVPIN_PERUCRIS_API_KEY");
    if (!apiKey) {
      throw AppError.config(
        "Falta configurar PJVPIN_PERUCRIS_API_KEY. El push a PeruCRIS requiere credenciales.",
      );
    }
    const url = `${this.privateBaseUrl.replace(/\/+$/, "")}/cerif/ingest`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const status = res.status;
    if (status === 401 || status === 403) {
      throw AppError.config(
        `La api-key de PeruCRIS no tiene permisos para ingestar CERIF (HTTP ${status}).`,
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.external(
        `PeruCRIS /cerif/ingest respondio ${status}: ${sanitizeExternalDetail(text)}`,
      );
    }
    return { status };
  }

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
