import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../errors/app-error";
import { sanitizeExternalDetail } from "../utils/sanitize";
import { DEFAULT_PURE_API_BASE_URL } from "../../config/defaults";

export interface FetchedPublication {
  pure_uuid: string;
  titulo: string;
  tipo_publicacion: string | null;
  doi: string | null;
  anio_publicacion: number | null;
  autores_json: string;
  estado_publicacion: string | null;
  journal_titulo: string | null;
  issn: string | null;
}

export interface PurePersonMapping {
  pure_person_id: string;
  dni: string | null;
}

interface PurePagedResult<T> {
  count?: number;
  items?: T[];
}

interface PureLocalizedValue {
  value?: string;
}

interface PureClassifiedValue {
  term?: PureLocalizedValue;
}

interface PurePersonName {
  lastName?: string;
  firstName?: string;
}

interface PureContributor {
  name?: PurePersonName;
}

interface PureElectronicVersion {
  doi?: string | null;
}

interface PurePublicationStatus {
  current?: boolean;
  publicationDate?: { year?: number | null };
  statuses?: PureClassifiedValue[];
}

interface PureJournalAssociation {
  title?: PureLocalizedValue;
  issn?: { value?: string };
}

interface PureResearchOutput {
  uuid?: string;
  title?: PureLocalizedValue;
  type?: PureClassifiedValue;
  contributors?: PureContributor[];
  electronicVersions?: PureElectronicVersion[];
  publicationStatuses?: PurePublicationStatus[];
  journalAssociation?: PureJournalAssociation;
}

interface PurePerson {
  uuid?: string;
}

interface PureIdentifier {
  typeDiscriminator?: string;
  value?: string;
  id?: string;
  type?: { uri?: string };
}

interface PurePersonDetail {
  identifiers?: PureIdentifier[];
}

@Injectable()
export class PureClient {
  private readonly logger = new Logger(PureClient.name);
  private readonly baseUrl: string;

  constructor(private readonly config: ConfigService) {
    this.baseUrl = config.get<string>("PJVPIN_PURE_API_BASE_URL") ?? DEFAULT_PURE_API_BASE_URL;
  }

  /**
   * Resuelve el UUID de Pure de una persona a partir de su Scopus Author ID.
   * Devuelve `null` si la persona no se encuentra.
   */
  async resolvePersonUuid(scopusAuthorId: string): Promise<string | null> {
    const apiKey = this.apiKey();
    const url = `${this.baseUrl.replace(/\/+$/, "")}/persons/search`;
    const res = await this.postJson(
      url,
      { size: 5, offset: 0, searchString: scopusAuthorId },
      apiKey,
      "/persons/search",
    );
    const result = (res as PurePagedResult<PurePerson>) ?? {};
    const first = (result.items ?? [])[0];
    return first?.uuid ? first.uuid : null;
  }

  /**
   * Descarga todas las publicaciones asociadas a un Scopus Author ID desde
   * Pure. Paginacion interna con size=50 hasta agotar resultados.
   */
  async fetchResearchOutputsByScopusId(scopusAuthorId: string): Promise<FetchedPublication[]> {
    const apiKey = this.apiKey();
    const url = `${this.baseUrl.replace(/\/+$/, "")}/research-outputs/search`;
    const all: FetchedPublication[] = [];
    const pageSize = 50;
    let offset = 0;
    for (;;) {
      const body = { size: pageSize, offset, searchString: scopusAuthorId };
      const page = (await this.postJson(
        url,
        body,
        apiKey,
        "/research-outputs/search",
      )) as PurePagedResult<PureResearchOutput>;
      const total = page.count ?? 0;
      const items = page.items ?? [];
      for (const item of items) {
        if (!item.uuid || item.uuid.length === 0) continue;
        all.push(mapResearchOutput(item));
      }
      offset += items.length;
      if (items.length === 0 || offset >= total) break;
    }
    return all;
  }

  /**
   * Descarga todas las personas de Pure (pagina `GET /persons?size=N&offset=M`)
   * y devuelve un mapeo `(PersonID del Master List, DNI)` por persona.
   */
  async fetchAllPersonsMapping(): Promise<PurePersonMapping[]> {
    const apiKey = this.apiKey();
    const base = `${this.baseUrl.replace(/\/+$/, "")}/persons`;
    const all: PurePersonMapping[] = [];
    const pageSize = 100;
    let offset = 0;
    for (;;) {
      const url = `${base}?size=${pageSize}&offset=${offset}`;
      const res = await this.getJson(url, apiKey, "/persons");
      const page = (res as PurePagedResult<PurePersonDetail>) ?? {};
      const total = page.count ?? 0;
      const items = page.items ?? [];
      for (const item of items) {
        const m = mapping(item);
        if (m.pure_person_id.length > 0) all.push(m);
      }
      offset += items.length;
      if (items.length === 0 || offset >= total) break;
    }
    return all;
  }

  private apiKey(): string {
    const key = this.config.get<string>("PJVPIN_PURE_API_KEY");
    if (!key || key.length === 0) {
      throw AppError.config("Falta configurar PJVPIN_PURE_API_KEY en el servidor.");
    }
    return key;
  }

  private async postJson(
    url: string,
    body: unknown,
    apiKey: string,
    label: string,
  ): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: {
          "api-key": apiKey,
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      this.logger.error(
        `Pure ${label}: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external(
        `Pure ${label} fallo de transporte. Verifique conectividad del servidor.`,
      );
    }
    return this.parseOrThrow(res, label);
  }

  private async getJson(url: string, apiKey: string, label: string): Promise<unknown> {
    let res: Response;
    try {
      res = await fetch(url, {
        method: "GET",
        headers: { "api-key": apiKey, Accept: "application/json" },
      });
    } catch (err) {
      this.logger.error(
        `Pure ${label}: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external(
        `Pure ${label} fallo de transporte. Verifique conectividad del servidor.`,
      );
    }
    return this.parseOrThrow(res, label);
  }

  private async parseOrThrow(res: Response, label: string): Promise<unknown> {
    if (res.status === 403) {
      throw AppError.config(
        `La API key de Pure no tiene permiso para acceder a ${label}. El administrador del servidor Pure debe habilitar el rol correspondiente.`,
      );
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw AppError.external(
        `Pure ${label} respondio ${res.status}: ${sanitizeExternalDetail(text)}`,
      );
    }
    try {
      return await res.json();
    } catch (err) {
      throw AppError.external(
        `Pure ${label} devolvio una respuesta JSON invalida: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
    }
  }
}

function mapping(item: PurePersonDetail): PurePersonMapping {
  const out: PurePersonMapping = { pure_person_id: "", dni: null };
  for (const ident of item.identifiers ?? []) {
    const discriminator = ident.typeDiscriminator ?? "";
    if (discriminator === "PrimaryId" && out.pure_person_id.length === 0) {
      out.pure_person_id = ident.value ?? "";
    } else if (discriminator === "ClassifiedId") {
      const uri = ident.type?.uri ?? "";
      if (uri.endsWith("/dni") && out.dni === null) {
        out.dni = ident.id ?? null;
      }
    }
  }
  return out;
}

function mapResearchOutput(item: PureResearchOutput): FetchedPublication {
  const titulo = item.title?.value ?? "";
  const tipo_publicacion = item.type?.term?.value ?? null;
  const doi = (item.electronicVersions ?? []).find((ev) => !!ev.doi)?.doi ?? null;
  const anio_publicacion =
    (item.publicationStatuses ?? []).find((s) => s.current)?.publicationDate?.year ?? null;
  const estado_publicacion =
    (item.publicationStatuses ?? []).find((s) => s.current)?.statuses?.[0]?.term?.value ?? null;
  const autores: string[] = (item.contributors ?? [])
    .map((c) => c.name)
    .filter((n): n is PurePersonName => !!n)
    .map((n) =>
      !n.firstName || n.firstName.length === 0
        ? (n.lastName ?? "")
        : `${n.lastName ?? ""}, ${n.firstName ?? ""}`.replace(/^,\s*/, ""),
    )
    .filter((s) => s.length > 0);
  const autores_json = JSON.stringify(autores);
  const journal_titulo = item.journalAssociation?.title?.value ?? null;
  const issn = item.journalAssociation?.issn?.value ?? null;
  return {
    pure_uuid: item.uuid ?? "",
    titulo,
    tipo_publicacion,
    doi,
    anio_publicacion,
    autores_json,
    estado_publicacion,
    journal_titulo,
    issn,
  };
}
