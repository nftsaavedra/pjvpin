/**
 * Tipos compartidos con el backend Rust para PeruCRIS.
 *
 * Espejo de:
 *  - src-tauri/src/shared/external/perucris_service.rs::PeruCrisPushResult
 *  - src-tauri/src/shared/external/perucris_validation_dto.rs
 *
 * Cualquier cambio aqui debe reflejarse en el Rust mirror y viceversa.
 */

/** Resultado de un push a PeruCRIS (POST /cerif/ingest). */
export type PeruCrisPushResult = {
  success: boolean;
  http_status: number | null;
  enviado_at: number;
  total_organizaciones: number;
  total_personas: number;
  total_proyectos: number;
  total_publicaciones: number;
  total_patentes: number;
};

/** Tipo de entidad validada contra PeruCRIS. */
export type ValidationTipo = "orgunit" | "person" | "project" | "publication" | "patent";

/** Item de validacion: una entidad local cruzada con PeruCRIS. */
export type PeruCrisValidationItem = {
  tipo: ValidationTipo;
  id_local: string;
  identificadores_esperados: Record<string, string | null>;
  encontrado_en_perucris: boolean;
  perucris_uuid?: string;
  perucris_handle?: string;
  last_modified_perucris?: string;
  diferencias: string[];
};

/** Reporte agregado de validacion. */
export type PeruCrisValidationReport = {
  ejecutado_at: number;
  total_evaluados: number;
  total_encontrados: number;
  total_faltantes: number;
  total_con_diferencias: number;
  tiempo_total_ms: number;
  fuente_perucris: string;
  items: PeruCrisValidationItem[];
};

/** Scope opcional para limitar la validacion a un subset. */
export type PeruCrisValidationScope =
  "todo" | "organizaciones" | "personas" | "proyectos" | "publicaciones" | "patentes";

/** Resultado del importador inicial (proyectos + publicaciones). */
export type PeruCrisImportResult = {
  proyectos: PeruCrisProyectosImportResult;
  publicaciones: PeruCrisPublicacionesImportResult;
};

export type PeruCrisProyectosImportResult = {
  total_evaluados: number;
  importados: number;
  omitidos_duplicado: number;
  errores: string[];
};

export type PeruCrisPublicacionesImportResult = {
  total_evaluados: number;
  importados: number;
  omitidos_duplicado: number;
  autores_vinculados: number;
  sin_autor_vinculado: number;
  errores: string[];
  avisos: string[];
};
