import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AppError } from "../errors/app-error";
import { sanitizeExternalDetail } from "../utils/sanitize";
import {
  DEFAULT_RENACYT_ACTO_VERSION,
  DEFAULT_RENACYT_API_BASE_URL,
  DEFAULT_RENACYT_FICHA_BASE_URL,
} from "../../config/defaults";

export interface RenacytFormacionAcademica {
  id: number;
  centro_estudios: string | null;
  grado_academico: string | null;
  titulo: string | null;
  fecha_inicio: number | null;
  fecha_fin: number | null;
  indicador_importado: boolean;
  puntaje_obtenido: number | null;
  considerado_para_cc: boolean;
  es_calificado: boolean;
}

export interface RenacytLookupResult {
  codigo_registro: string;
  id_investigador: string;
  nombre_completo: string | null;
  numero_documento: string | null;
  nivel: string | null;
  grupo: string | null;
  condicion: string | null;
  fecha_informe_calificacion: number | null;
  fecha_registro: number | null;
  fecha_ultima_revision: number | null;
  orcid: string | null;
  scopus_author_id: string | null;
  ficha_url: string;
  solicitud_id: number | null;
  formaciones_academicas_json: string | null;
}

export interface RenacytBusquedaExitoso {
  codigo_registro: string;
  id_investigador: string;
  numero_documento: string;
  nivel: string;
  grupo: string;
  condicion: string;
  orcid: string;
  tipo_documento: string;
  solicitud_id: number | null;
}

interface RenacytPostulanteEnvelope {
  responseCode?: string;
  data?: {
    idInvestigador?: string;
    idOrcid?: string;
    idPerfilScopus?: string;
    nroDocumento?: string;
    nombreCompleto?: string;
  };
  messageErrors?: string;
}

interface RenacytActoRegistralData {
  codigoRegistro?: string;
  numeroDocumento?: string;
  orcid?: string;
  ctiVitae?: string;
  grupo?: string;
  nivel?: string;
  condicion?: string;
  fechaRegistroActivo?: number | null;
  solicitudId?: number | null;
}

interface RenacytCriteriosResponse {
  criterioARequest?: {
    formacionesAcademicas?: Array<{
      formacionAcademicaPOJO?: {
        id?: number;
        descCentroEstudios?: string;
        descGradoAcademico?: string;
        fechaInicio?: number | null;
        fechaFin?: number | null;
        indicadorImportado?: boolean;
        titulo?: string;
        puntajeObtenido?: number | null;
      };
      consideradoParaCC?: boolean;
      esCalificado?: boolean;
    }>;
  };
}

interface RenacytBusquedaEnvelope {
  data?: Array<{
    id?: number;
    codigoRegistro?: string;
    numeroDocumento?: string;
    tipoDocumento?: string;
    ctiVitae?: string;
    nivel?: string;
    grupo?: string;
    condicion?: string;
    orcid?: string;
    solicitudId?: number | null;
  }>;
}

function nonEmpty(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function firstNonEmpty(values: Array<string | null | undefined>): string | null {
  for (const v of values) {
    const r = nonEmpty(v);
    if (r !== null) return r;
  }
  return null;
}

function normalizeIdInvestigador(value: string): string {
  const cleaned = value.trim().toUpperCase();
  if (cleaned.length === 0) {
    throw AppError.external("Ingrese un codigo RENACYT o ID de investigador valido.");
  }
  let numeric: string;
  if (cleaned.startsWith("P")) {
    const stripped = cleaned.slice(1).replace(/^0+/, "");
    numeric = stripped.length === 0 ? "0" : stripped;
  } else {
    numeric = cleaned;
  }
  if (!/^\d+$/.test(numeric)) {
    throw AppError.external(
      "El codigo RENACYT o ID de investigador solo debe contener valores numericos validos.",
    );
  }
  return numeric;
}

function buildCodigoRegistro(idInvestigador: string): string {
  const idNum = Number.parseInt(idInvestigador, 10);
  if (Number.isNaN(idNum)) return `P${idInvestigador}`;
  return `P${String(idNum).padStart(7, "0")}`;
}

function normalizeCodigoRegistro(value: string): string {
  const trimmed = value.trim().toUpperCase();
  if (trimmed.length === 0) {
    throw AppError.external("Ingrese un codigo RENACYT valido.");
  }
  if (!trimmed.startsWith("P")) {
    throw AppError.external(`El codigo RENACYT '${value.trim()}' debe iniciar con el prefijo 'P'.`);
  }
  const rest = trimmed.slice(1);
  if (rest.length === 0 || rest.length > 10 || !/^\d+$/.test(rest)) {
    throw AppError.external(
      `El codigo RENACYT '${value.trim()}' debe tener el formato P seguido de digitos (ej. P0013866).`,
    );
  }
  return trimmed;
}

function extractDateValue(html: string, label: string): number | null {
  const idx = html.indexOf(label);
  if (idx < 0) return null;
  const tail = html.slice(idx + label.length);
  let value = "";
  for (const ch of tail) {
    if (ch === "\u2022" || ch === "<" || ch === "\n" || ch === "\r") break;
    value += ch;
  }
  const normalized = value.replace(/&nbsp;/g, " ").trim();
  if (normalized.length === 0) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  const year = Number(m[3]);
  const date = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

@Injectable()
export class RenacytClient {
  private readonly logger = new Logger(RenacytClient.name);
  private readonly baseUrl: string;
  private readonly fichaBaseUrl: string;
  private readonly actoVersion: string;

  constructor(config: ConfigService) {
    this.baseUrl =
      config.get<string>("PJVPIN_RENACYT_API_BASE_URL") ?? DEFAULT_RENACYT_API_BASE_URL;
    this.fichaBaseUrl =
      config.get<string>("PJVPIN_RENACYT_FICHA_BASE_URL") ?? DEFAULT_RENACYT_FICHA_BASE_URL;
    this.actoVersion =
      config.get<string>("PJVPIN_RENACYT_ACTO_VERSION") ?? DEFAULT_RENACYT_ACTO_VERSION;
  }

  /**
   * Consulta RENACYT para un investigador identificado por codigo RENACYT
   * (P0013866) o ID numerico interno (13866). Devuelve un `RenacytLookupResult`
   * que el servicio de investigadores proyecta al modelo RENACYT del cardex.
   */
  async consultarInvestigador(codigoOId: string): Promise<RenacytLookupResult> {
    const idInvestigador = normalizeIdInvestigador(codigoOId);
    const base = this.baseUrl.replace(/\/+$/, "");
    const postulanteUrl = `${base}/postulante/obtenerDatosPostulante/${idInvestigador}`;
    const actoUrl = `${base}/actoRegistral/obtenerActoRegistralActivoCtiVitae/${this.actoVersion.trim()}/${idInvestigador}`;
    const fichaUrl = this.buildFichaUrl(idInvestigador);

    let postulanteRaw: RenacytPostulanteEnvelope;
    let acto: RenacytActoRegistralData;
    let fichaHtml: string;
    try {
      const [postulanteRes, actoRes, fichaRes] = await Promise.all([
        fetch(postulanteUrl, { method: "GET" }),
        fetch(actoUrl, { method: "GET" }),
        fetch(fichaUrl, { method: "GET" }),
      ]);
      if (!postulanteRes.ok) {
        throw AppError.external(
          `La consulta RENACYT del postulante no pudo completarse (${postulanteRes.status}).`,
        );
      }
      if (!actoRes.ok) {
        throw AppError.external(
          `La consulta RENACYT del acto registral no pudo completarse (${actoRes.status}).`,
        );
      }
      postulanteRaw = (await postulanteRes.json()) as RenacytPostulanteEnvelope;
      acto = (await actoRes.json()) as RenacytActoRegistralData;
      fichaHtml = await fichaRes.text();
    } catch (err) {
      if (err instanceof AppError) throw err;
      this.logger.error(
        `Error RENACYT: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external(
        "No se pudo conectar al servicio RENACYT. Verifique conectividad del servidor.",
      );
    }

    const postulante = postulanteRaw.data;
    if (!postulante) {
      const messageErrors = postulanteRaw.messageErrors?.trim() ?? "";
      throw AppError.external(
        messageErrors.length > 0
          ? sanitizeExternalDetail(messageErrors)
          : "RENACYT no devolvio datos del investigador consultado.",
      );
    }
    if ((postulanteRaw.responseCode ?? "").trim() !== "1") {
      throw AppError.external(
        "RENACYT devolvio una respuesta no valida para el investigador consultado.",
      );
    }

    const formacionesJson =
      acto.solicitudId != null ? await this.fetchFormacionesAcademicasJson(acto.solicitudId) : null;

    return {
      codigo_registro: nonEmpty(acto.codigoRegistro) ?? buildCodigoRegistro(idInvestigador) ?? "",
      id_investigador:
        firstNonEmpty([acto.ctiVitae, postulante.idInvestigador, idInvestigador]) ?? "",
      nombre_completo: nonEmpty(postulante.nombreCompleto),
      numero_documento: firstNonEmpty([acto.numeroDocumento, postulante.nroDocumento]),
      nivel: nonEmpty(acto.nivel),
      grupo: nonEmpty(acto.grupo),
      condicion: nonEmpty(acto.condicion),
      fecha_informe_calificacion: extractDateValue(fichaHtml, "Fecha de informe de calificacion :"),
      fecha_registro: acto.fechaRegistroActivo ?? null,
      fecha_ultima_revision: extractDateValue(fichaHtml, "Fecha de ultima revision :"),
      orcid: firstNonEmpty([acto.orcid, postulante.idOrcid]),
      scopus_author_id: nonEmpty(postulante.idPerfilScopus),
      ficha_url: fichaUrl,
      solicitud_id: acto.solicitudId ?? null,
      formaciones_academicas_json: formacionesJson,
    };
  }

  /**
   * Busca un investigador RENACYT por su DNI (8 digitos). Retorna `null`
   * si no existe (DNI no encontrado / no numerico / longitud incorrecta).
   */
  async buscarPorDni(dni: string): Promise<RenacytBusquedaExitoso | null> {
    if (!/^\d{8}$/.test(dni)) return null;
    const base = this.baseUrl.replace(/\/+$/, "");
    const url = `${base}/actoRegistral/obtenerActosRegistralesActivos/reglamento/${this.actoVersion.trim()}/pagina/1/numeroRegistros/10`;
    const payload = [
      {
        operadorBusqueda: "",
        operadorLogico: "and",
        id: 21,
        valor: this.actoVersion.trim(),
        campo: "",
      },
      {
        operadorBusqueda: "=",
        operadorLogico: "and",
        id: 7,
        valor: dni,
        campo: "a.numero_documento",
      },
    ];
    let res: Response;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      this.logger.error(
        `Error busqueda RENACYT: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external(
        "No se pudo conectar al servicio de busqueda RENACYT. Verifique conectividad del servidor.",
      );
    }
    if (!res.ok) {
      throw AppError.external(`La busqueda RENACYT por DNI no pudo completarse (${res.status}).`);
    }
    let envelope: RenacytBusquedaEnvelope;
    try {
      envelope = (await res.json()) as RenacytBusquedaEnvelope;
    } catch (err) {
      throw AppError.external(
        `La respuesta de busqueda RENACYT no es valida: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
    }
    const data = envelope.data ?? [];
    if (data.length === 0) return null;
    const item = data[0];
    const idInvestigador =
      firstNonEmpty([item.ctiVitae, item.id != null ? String(item.id) : null]) ?? "";
    return {
      codigo_registro: nonEmpty(item.codigoRegistro) ?? "",
      id_investigador: idInvestigador,
      numero_documento: item.numeroDocumento ?? "",
      nivel: nonEmpty(item.nivel) ?? "",
      grupo: nonEmpty(item.grupo) ?? "",
      condicion: nonEmpty(item.condicion) ?? "",
      orcid: nonEmpty(item.orcid) ?? "",
      tipo_documento: nonEmpty(item.tipoDocumento) ?? "",
      solicitud_id: item.solicitudId ?? null,
    };
  }

  /**
   * Descarga el PDF "Constancia Reporte de Actividad" emitido por RENACYT
   * para un investigador identificado por su `codigo_registro` (formato P0013866).
   * Endpoint publico (sin auth). Aplica timeout estricto (30s) y valida Content-Type.
   */
  async descargarConstancia(codigoRegistro: string): Promise<Buffer> {
    const codigoNormalizado = normalizeCodigoRegistro(codigoRegistro);
    const base = this.baseUrl.replace(/\/+$/, "");
    const url = `${base}/actoRegistral/obtenerConstanciaReporteActividad/${codigoNormalizado}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30_000);
    let res: Response;
    try {
      res = await fetch(url, { method: "GET", signal: controller.signal });
    } catch (err) {
      clearTimeout(timer);
      this.logger.error(
        `Error constancia RENACYT: ${sanitizeExternalDetail(err instanceof Error ? err.message : String(err))}`,
      );
      throw AppError.external(
        "No se pudo conectar al servicio RENACYT para la constancia. Verifique conectividad del servidor.",
      );
    }
    clearTimeout(timer);

    if (res.status === 404) {
      throw AppError.external(
        `No se encontro constancia RENACYT para el codigo ${codigoNormalizado}.`,
      );
    }
    if (!res.ok) {
      throw AppError.external(
        `RENACYT devolvio ${res.status} al solicitar la constancia ${codigoNormalizado}.`,
      );
    }
    const contentType = (res.headers.get("content-type") ?? "").toLowerCase();
    if (!contentType.includes("pdf")) {
      throw AppError.external(
        `La respuesta RENACYT para ${codigoNormalizado} no es un PDF (Content-Type: ${contentType || "vacio"}).`,
      );
    }
    const arrayBuffer = await res.arrayBuffer();
    const bytes = Buffer.from(arrayBuffer);
    if (bytes.length < 1024) {
      throw AppError.external(
        `La constancia RENACYT para ${codigoNormalizado} es demasiado pequena (${bytes.length} bytes); posible pagina de error.`,
      );
    }
    return bytes;
  }

  private buildFichaUrl(idInvestigador: string): string {
    const base = this.fichaBaseUrl.replace(/\/+$/, "");
    return `${base}?idInvestigador=${encodeURIComponent(idInvestigador)}`;
  }

  private async fetchFormacionesAcademicasJson(solicitudId: number): Promise<string | null> {
    const base = this.baseUrl.replace(/\/+$/, "");
    const url = `${base}/usuario/obtenerInformacionCriteriosFiltroCc/${solicitudId}`;
    let res: Response;
    try {
      res = await fetch(url, { method: "GET" });
    } catch {
      return null;
    }
    if (!res.ok) return null;
    let payload: RenacytCriteriosResponse;
    try {
      payload = (await res.json()) as RenacytCriteriosResponse;
    } catch {
      return null;
    }
    const formaciones = (payload.criterioARequest?.formacionesAcademicas ?? [])
      .map((entry): RenacytFormacionAcademica | null => {
        const pojo = entry.formacionAcademicaPOJO;
        if (!pojo) return null;
        return {
          id: pojo.id ?? 0,
          centro_estudios: nonEmpty(pojo.descCentroEstudios),
          grado_academico: nonEmpty(pojo.descGradoAcademico),
          titulo: nonEmpty(pojo.titulo),
          fecha_inicio: pojo.fechaInicio ?? null,
          fecha_fin: pojo.fechaFin ?? null,
          indicador_importado: pojo.indicadorImportado ?? false,
          puntaje_obtenido: pojo.puntajeObtenido ?? null,
          considerado_para_cc: entry.consideradoParaCC ?? false,
          es_calificado: entry.esCalificado ?? false,
        };
      })
      .filter((f): f is RenacytFormacionAcademica => f !== null);
    if (formaciones.length === 0) return null;
    return JSON.stringify(formaciones);
  }
}
