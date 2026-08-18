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
}

export interface CreateOrgUnitRequest {
  nombre: string;
  ubigeoCodigo?: string | null;
  ruc?: string | null;
  rorId?: string | null;
  isniId?: string | null;
  scopusId?: string | null;
  sectorInstitucional?: string | null;
  tipoOrganizacion: string;
  tipoDependencia?: string | null;
  tipoEducacionSuperior?: string | null;
  ciiuCodigo?: string | null;
  esPublica: boolean;
  parentId?: string | null;
}

export interface UpdateOrgUnitRequest {
  nombre?: string | null;
  ubigeoCodigo?: string | null;
  rorId?: string | null;
  isniId?: string | null;
  scopusId?: string | null;
  sectorInstitucional?: string | null;
  tipoDependencia?: string | null;
  tipoEducacionSuperior?: string | null;
  ciiuCodigo?: string | null;
  esPublica?: boolean;
  parentId?: string | null;
}
