export const MONGO_APP_NAME = "PJVPIN";
export const DEFAULT_PORT = 3000;
export const DEFAULT_GLOBAL_PREFIX = "api/v1";

export const DEFAULT_RENIEC_API_BASE_URL = "https://api.decolecta.com/v1";
export const RENIEC_TEST_DNI = "00000000";

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
