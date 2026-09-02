/**
 * DTOs de respuesta de los 6 datasets de exportacion (`GET /reportes/export/*`).
 *
 * Shapes 1:1 con los structs Rust `apps/desktop/src-tauri/src/proyectos/dto.rs`
 * (L255-365). snake_case explicito para preservar el contrato durante la fase 1
 * de la migracion (consistente con `dashboard/dto/dashboard.dto.ts`).
 */

export class ExportDataDto {
  proyecto!: string;
  grado!: string;
  renacyt_nivel!: string;
  investigador!: string;
  dni!: string;
}

export class ExportDataConProjectosDto {
  investigador!: string;
  dni!: string;
  grado!: string;
  renacyt_nivel!: string;
  grupo_investigacion!: string | null;
  cantidad_proyectos!: number;
  proyectos!: string | null;
}

export class ExportDataGrupoDto {
  grupo!: string;
  descripcion!: string | null;
  coordinador!: string | null;
  cantidad_miembros!: number;
  miembros!: string | null;
  lineas_investigacion!: string[];
  cantidad_proyectos!: number;
  proyectos!: string | null;
}

export class ExportDataRecursoDto {
  tipo_recurso!: string;
  titulo_o_nombre!: string;
  proyecto!: string | null;
  investigador!: string | null;
  tipo!: string | null;
  estado!: string | null;
  moneda!: string | null;
  monto!: number | null;
}

export class ExportDataInvestigadorPerfilDto {
  dni!: string;
  nombres_apellidos!: string;
  grado!: string;
  renacyt_nivel!: string | null;
  renacyt_grupo!: string | null;
  renacyt_condicion!: string | null;
  renacyt_orcid!: string | null;
  grupo_investigacion!: string | null;
  cantidad_proyectos!: number;
  cantidad_publicaciones!: number;
  proyectos!: string | null;
  activo!: boolean;
}

export class ExportDataProyectoAreaDto {
  area!: string;
  cantidad_proyectos!: number;
  proyectos!: string | null;
  cantidad_investigadores!: number;
}
