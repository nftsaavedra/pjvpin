/**
 * DTOs del reporte "Pure Master List" (V8) - `GET /reportes/pure/masterlist`.
 *
 * Port 1:1 de `apps/desktop/src-tauri/src/reportes/dto.rs` (PureMasterlistData +
 * PureMasterlistPersonRow + PureMasterlistStaffRow + PureMasterlistSummary).
 * Los nombres de campos coinciden EXACTAMENTE con las columnas de la plantilla
 * V8 de Elsevier Pure para que el workbook sea reconocido.
 *
 * snake_case explicito (sin rename_all) para preservar el contrato con el JSON
 * serializado por el backend Rust legacy.
 */

/**
 * Una fila de la hoja `Persons` (26 columnas en plantilla V8). Solo se emiten
 * los campos que PJVPIN puede poblar - el resto va `null` (replica `Option<T>`
 * del Rust).
 */
export class PureMasterlistPersonRow {
  person_id!: string;
  profiled!: string;
  username!: string | null;
  email!: string | null;
  title!: string | null;
  title_translated!: string | null;
  post_nominals!: string | null;
  firstname!: string | null;
  lastname!: string | null;
  firstname_translated!: string | null;
  lastname_translated!: string | null;
  first_name_known_as!: string | null;
  last_name_known_as!: string | null;
  first_name_sorting!: string | null;
  last_name_sorting!: string | null;
  former_last_name!: string | null;
  prior_affiliations!: string | null;
  nationality!: string | null;
  gender!: string;
  visibility!: string;
  orcid!: string | null;
  profile_photo!: string | null;
  client_id_1!: string | null;
  client_id_2!: string | null;
  client_id_3!: string | null;
  externally_authenticated!: string;
}

/** Una fila de la hoja `Stafforganisationrelations` (18 columnas). */
export class PureMasterlistStaffRow {
  person_id!: string;
  organisation_id!: string;
  contract_type!: string | null;
  job_title!: string | null;
  job_description!: string | null;
  job_description_translated!: string | null;
  employed_as!: string;
  fte!: string | null;
  start_date!: string;
  end_date!: string | null;
  direct_phone_nr!: string | null;
  mobile_phone_nr!: string | null;
  fax_nr!: string | null;
  email!: string | null;
  website_url_en!: string | null;
  website_url_translated!: string | null;
  primary!: string;
  staff_type!: string;
}

/** Resumen no-bloqueante para mostrar en el panel antes del export. */
export class PureMasterlistSummary {
  total!: number;
  actualizaciones_pure!: number;
  altas_nuevas!: number;
  sin_correo!: number;
  sin_orcid!: number;
  /**
   * Total de personas en el portal Pure remoto. Solo se popula si el caller
   * lo conoce (panel de sync previo); en el contrato Rust siempre se emite
   * (como 0 si no se conoce) para preservar la forma del JSON.
   */
  pure_remoto_total!: number;
}

/** Payload completo del endpoint `GET /reportes/pure/masterlist`. */
export class PureMasterlistData {
  persons!: PureMasterlistPersonRow[];
  staff_relations!: PureMasterlistStaffRow[];
  summary!: PureMasterlistSummary;
}
