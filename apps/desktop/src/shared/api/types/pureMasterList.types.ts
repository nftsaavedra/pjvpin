export interface PureMasterlistPersonRow {
  person_id: string;
  profiled: string;
  username?: string | null;
  email?: string | null;
  title?: string | null;
  title_translated?: string | null;
  post_nominals?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  firstname_translated?: string | null;
  lastname_translated?: string | null;
  first_name_known_as?: string | null;
  last_name_known_as?: string | null;
  first_name_sorting?: string | null;
  last_name_sorting?: string | null;
  former_last_name?: string | null;
  prior_affiliations?: string | null;
  nationality?: string | null;
  gender: string;
  visibility: string;
  orcid?: string | null;
  profile_photo?: string | null;
  client_id1?: string | null;
  client_id2?: string | null;
  client_id3?: string | null;
  externally_authenticated: string;
}

export interface PureMasterlistStaffRow {
  person_id: string;
  organisation_id: string;
  contract_type?: string | null;
  job_title?: string | null;
  job_description?: string | null;
  job_description_translated?: string | null;
  employed_as: string;
  fte?: string | null;
  start_date: string;
  end_date?: string | null;
  direct_phone_nr?: string | null;
  mobile_phone_nr?: string | null;
  fax_nr?: string | null;
  email?: string | null;
  website_url_en?: string | null;
  website_url_translated?: string | null;
  primary: string;
  staff_type: string;
}

export interface PureMasterlistSummary {
  total: number;
  actualizaciones_pure: number;
  altas_nuevas: number;
  sin_correo: number;
  sin_orcid: number;
  pure_remoto_total: number;
}

export interface PureMasterlistData {
  persons: PureMasterlistPersonRow[];
  staff_relations: PureMasterlistStaffRow[];
  summary: PureMasterlistSummary;
}

export interface SyncPurePersonIdsResult {
  total_pure: number;
  matched: number;
  assigned: number;
  unmatched_dnis: string[];
}
