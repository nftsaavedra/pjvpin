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
  httpStatus: number | null;
  enviadoAt: number;
  totalOrganizaciones: number;
  totalPersonas: number;
  totalProyectos: number;
  totalPublicaciones: number;
  totalPatentes: number;
};

/** Tipo de entidad validada contra PeruCRIS. */
export type ValidationTipo = "orgunit" | "person" | "project" | "publication" | "patent";

/** Item de validacion: una entidad local cruzada con PeruCRIS. */
export type PeruCrisValidationItem = {
  tipo: ValidationTipo;
  idLocal: string;
  identificadoresEsperados: Record<string, string | null>;
  encontradoEnPeruCris: boolean;
  peruCrisUuid?: string;
  peruCrisHandle?: string;
  lastModifiedPeruCris?: string;
  diferencias: string[];
};

/** Reporte agregado de validacion. */
export type PeruCrisValidationReport = {
  ejecutadoAt: number;
  totalEvaluados: number;
  totalEncontrados: number;
  totalFaltantes: number;
  totalConDiferencias: number;
  tiempoTotalMs: number;
  fuentePeruCris: string;
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
  totalEvaluados: number;
  importados: number;
  omitidosDuplicado: number;
  errores: string[];
};

export type PeruCrisPublicacionesImportResult = {
  totalEvaluados: number;
  importados: number;
  omitidosDuplicado: number;
  autoresVinculados: number;
  sinAutorVinculado: number;
  errores: string[];
  avisos: string[];
};
