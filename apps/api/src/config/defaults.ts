export const MONGO_APP_NAME = "PJVPIN";
export const DEFAULT_PORT = 3000;
export const DEFAULT_GLOBAL_PREFIX = "api/v1";

export const DEFAULT_RENIEC_API_BASE_URL = "https://api.decolecta.com/v1";
export const RENIEC_TEST_DNI = "00000000";

export const DEFAULT_RENACYT_API_BASE_URL = "https://renacyt.concytec.gob.pe/renacyt-backend";
export const DEFAULT_RENACYT_FICHA_BASE_URL =
  "https://servicio-renacyt.concytec.gob.pe/ficha-renacyt/";
export const DEFAULT_RENACYT_ACTO_VERSION = "2021";
export const RENACYT_TEST_CTI_VITAE = "80203";

export const DEFAULT_PURE_API_BASE_URL = "https://pure.unf.edu.pe/ws/api";

export const DEFAULT_PERUCRIS_API_BASE_URL = "https://perucris.example.org/api";
export const DEFAULT_PERUCRIS_PUBLIC_API_BASE_URL = "https://rest.perucris.pe/server/api";

export const PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID = "UNF001";
export const PURE_MASTERLIST_DEFAULT_VISIBILITY = "public";
export const PURE_MASTERLIST_DEFAULT_EMPLOYED_AS = "academic";
export const PURE_MASTERLIST_DEFAULT_STAFF_TYPE = "academic";
export const PURE_MASTERLIST_DEFAULT_START_DATE = "2025-06-02";
/**
 * `ExternallyAuthenticated` por defecto. La plantilla institucional usa `yes`
 * para todos los investigadores. Port de
 * `shared::defaults::PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH`.
 */
export const PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH = "yes";

export const CONSTANCIA_PDF_MIN_BYTES = 1024;
export const CONSTANCIA_PDF_TIMEOUT_MS = 30_000;
export const IMPORT_BATCH_ASYNC_THRESHOLD = 25;
export const IMPORT_BATCH_CONCURRENCY = 5;

export const JWT_ACCESS_TTL_DEFAULT = "15m";
export const JWT_REFRESH_TTL_DEFAULT = "7d";

export const AUDIT_LOG_DEFAULT_PATH = "pjvpin-audit.log";

export const DEFAULT_CORS_ORIGINS = [
  "tauri://localhost",
  "http://tauri.localhost",
  "http://localhost:1420",
];

export const SECRET_KEYWORDS_TO_REDACT = [
  "api-key",
  "authorization",
  "bearer",
  "token",
  "password",
  "secret",
  "PJVPIN_",
  "mongodb://",
  "mongodb+srv://",
] as const;

export const SANITIZE_MAX_LENGTH = 512;

export const E11000_FIELDS_USER_FRIENDLY: Record<string, string> = {
  username: "El nombre de usuario ya esta registrado.",
  dni: "El DNI ya esta registrado.",
  id_usuario: "Identificador de usuario duplicado.",
  id_persona: "Persona duplicada.",
  id_investigador: "Investigador duplicado.",
  id_proyecto: "Proyecto duplicado.",
  id_patente: "Patente duplicada.",
  id_grupo: "Grupo duplicado.",
  id_org_unit: "Unidad organizativa duplicada.",
  id_publicacion: "Publicacion duplicada.",
  id_equipamiento: "Equipamiento duplicado.",
  id_financiamiento: "Financiamiento duplicado.",
  id_catalogo: "Item de catalogo duplicado.",
  id_grado: "Grado academico duplicado.",
  id_evento: "Evento academico duplicado.",
  numero_patente: "Numero de patente duplicado.",
  codigo_institucional: "Codigo institucional duplicado.",
  codigo: "Codigo duplicado.",
  codigo_skos: "Codigo SKOS duplicado.",
  ruc: "RUC duplicado.",
  doi: "DOI duplicado.",
  pure_uuid: "UUID de Pure duplicado.",
  renacyt_codigo_registro: "Codigo RENACYT duplicado.",
  renacyt_orcid: "ORCID RENACYT duplicado.",
};
