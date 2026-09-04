export interface OrgUnit {
  id_org_unit: string;
  nombre: string;
  ubigeo_codigo?: string | null;
  ruc?: string | null;
  ror_id?: string | null;
  isni_id?: string | null;
  scopus_id?: string | null;
  sector_institucional?: string | null;
  tipo_organizacion: string;
  tipo_dependencia?: string | null;
  tipo_educacion_superior?: string | null;
  ciiu_codigo?: string | null;
  es_publica: boolean;
  parent_id?: string | null;
  updated_at?: number | null;
  // ---- N2-G: alineamiento PeruCRIS ----
  legal_name?: string | null;
  acronimo?: string | null;
  web_site?: string | null;
  direccion?: string | null;
  pais?: string | null;
  descripcion?: string | null;
  rin_id?: string | null;
  sunedu_clasificacion?: string | null;
  sunedu_estado?: string | null;
  sunedu_resolucion?: string | null;
  perucris_uuid?: string | null;
  perucris_handle?: string | null;
}

export interface CreateOrgUnitRequest {
  nombre: string;
  ubigeo_codigo?: string | null;
  ruc?: string | null;
  ror_id?: string | null;
  isni_id?: string | null;
  scopus_id?: string | null;
  sector_institucional?: string | null;
  tipo_organizacion: string;
  tipo_dependencia?: string | null;
  tipo_educacion_superior?: string | null;
  ciiu_codigo?: string | null;
  es_publica: boolean;
  parent_id?: string | null;
  // ---- N2-G: alineamiento PeruCRIS ----
  legal_name?: string | null;
  acronimo?: string | null;
  web_site?: string | null;
  direccion?: string | null;
  pais?: string | null;
  descripcion?: string | null;
  rin_id?: string | null;
  sunedu_clasificacion?: string | null;
  sunedu_estado?: string | null;
  sunedu_resolucion?: string | null;
  perucris_uuid?: string | null;
  perucris_handle?: string | null;
}

export interface UpdateOrgUnitRequest {
  nombre?: string | null;
  ubigeo_codigo?: string | null;
  ror_id?: string | null;
  isni_id?: string | null;
  scopus_id?: string | null;
  sector_institucional?: string | null;
  tipo_dependencia?: string | null;
  tipo_educacion_superior?: string | null;
  ciiu_codigo?: string | null;
  es_publica?: boolean;
  parent_id?: string | null;
  // ---- N2-G: alineamiento PeruCRIS ----
  legal_name?: string | null;
  acronimo?: string | null;
  web_site?: string | null;
  direccion?: string | null;
  pais?: string | null;
  descripcion?: string | null;
  rin_id?: string | null;
  sunedu_clasificacion?: string | null;
  sunedu_estado?: string | null;
  sunedu_resolucion?: string | null;
  perucris_uuid?: string | null;
  perucris_handle?: string | null;
}
