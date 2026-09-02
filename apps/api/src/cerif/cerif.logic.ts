/**
 * Mappers puros y `parseScope` para el exportador CERIF.
 *
 * Port de `apps/desktop/src-tauri/src/reportes/cerif.rs` — funciones
 * puras (sin acceso a Mongo) que transforman datos de repositorio a
 * entidades CERIF. Testeables sin mocks.
 *
 * Las interfaces de entrada (`OrgUnitInput`, `PersonaInput`, etc.)
 * definen el contrato mínimo que el repositorio debe cumplir.
 */

import { AppError } from "../infra/errors/app-error";
import { generoToSkos, naturalezaToSkos } from "./cerif.vocab";
import type {
  CerifAutor,
  CerifOrgUnit,
  CerifParticipante,
  CerifPatente,
  CerifPersonaRef,
  CerifPerson,
  CerifProyecto,
  CerifProyectoFinanciamiento,
  CerifProyectoOrganizacion,
  CerifPublicacion,
  CerifScope,
  CerifTitular,
} from "./dto/cerif.dto";

// ─── Input types (contrato del repositorio) ─────────────────────────────────

export interface OrgUnitInput {
  id_org_unit: string;
  nombre: string;
  tipo_organizacion: string;
  tipo_dependencia: string | null;
  es_publica: boolean;
  ruc: string | null;
  ror_id: string | null;
  isni_id: string | null;
  scopus_id: string | null;
  ubigeo_codigo: string | null;
  sector_institucional: string | null;
  tipo_educacion_superior: string | null;
  ciiu_codigo: string | null;
  parent_id: string | null;
  perucris_uuid: string | null;
  perucris_handle: string | null;
}

export interface PersonaInput {
  id_persona: string;
  dni: string;
  nombres: string | null;
  apellido_paterno: string | null;
  apellido_materno: string | null;
  nombre_completo: string;
  sexo: string | null;
}

export interface InvestigadorInput {
  id_investigador: string;
  persona_id: string;
  tipo_documento: string | null;
  renacyt_orcid: string | null;
  renacyt_scopus_author_id: string | null;
  renacyt_codigo_registro: string | null;
  renacyt_nivel: string | null;
}

export interface ProyectoInput {
  id_proyecto: string;
  titulo_proyecto: string;
  codigo: string;
  tipo_actividad_ocde: string | null;
  ambito_geografico: string | null;
  estado_concytec: string | null;
  tematica_ambiental: string | null;
  tematica_salud: string | null;
  campo_ocde: string | null;
  programas_relacionados: string[];
  perucris_uuid: string | null;
}

export interface ParticipacionInput {
  id_investigador: string;
  id_proyecto: string;
  rol: string;
  es_responsable: boolean;
  id_org_unit_afiliacion: string | null;
  horas_dedicacion_semanal: number | null;
}

export interface FinanciamientoPivotInput {
  id_financiamiento: string;
  id_proyecto: string;
  monto_asignado: number | null;
  moneda: string;
}

export interface FinanciamientoInput {
  id_financiamiento: string;
  codigo: string | null;
  nombre: string | null;
  modalidad: string | null;
  id_org_unit_financiadora: string | null;
  monto: number | null;
}

export interface ProyectoOrganizacionInput {
  id_org_unit: string;
  id_proyecto: string;
  rol: string;
}

export interface PublicacionInput {
  id_publicacion: string;
  titulo: string;
  tipo: string;
  doi: string | null;
  issn: string | null;
  isbn: string | null;
  anio: number | null;
  fecha_publicacion: number | null;
  revista_titulo: string | null;
  editorial: string | null;
  id_org_unit_editora: string | null;
  volumen: string | null;
  numero_issue: string | null;
  paginas: string | null;
  idioma: string | null;
  resumen: string | null;
  palabras_clave: string[];
  acceso_abierto: string | null;
  scimago_cuartil: string | null;
  wos_cuartil: string | null;
  es_revisado_por_pares: boolean;
  handle_url: string | null;
  estado_publicacion: string | null;
  dominio_origen: string;
  pure_uuid: string | null;
  id_proyecto: string | null;
}

export interface PublicacionAutorInput {
  id_persona: string;
  id_publicacion: string;
  orden: number;
  es_autor_correspondiente: boolean;
  id_org_unit_afiliacion: string | null;
}

export interface PatenteInput {
  id_patente: string;
  titulo: string;
  numero_patente: string | null;
  tipo: string | null;
  estado: string | null;
  fecha_solicitud: number | null;
  fecha_concesion: number | null;
  pais: string | null;
  entidad_concedente: string | null;
  id_org_unit_concedente: string | null;
  clasificacion_ipc: string | null;
  descripcion: string | null;
  proyecto_id: string | null;
}

export interface PatenteInventorInput {
  id_persona: string;
  id_patente: string;
  orden: number;
}

export interface PatenteTitularInput {
  holder_type: string;
  id_org_unit: string | null;
  id_persona: string | null;
  id_patente: string;
  orden: number;
}

// ─── parseScope ─────────────────────────────────────────────────────────────

const SCOPE_MAP: Record<string, CerifScope> = {
  "": "todo",
  todo: "todo",
  all: "todo",
  organizaciones: "organizaciones",
  organizacion: "organizaciones",
  org_units: "organizaciones",
  orgunits: "organizaciones",
  personas: "personas",
  persona: "personas",
  investigadores: "personas",
  investigador: "personas",
  proyectos: "proyectos",
  proyecto: "proyectos",
  publicaciones: "publicaciones",
  publicacion: "publicaciones",
  patentes: "patentes",
  patente: "patentes",
};

export function parseScope(raw: string | null | undefined): CerifScope {
  if (raw == null) return "todo";
  const key = raw.trim().toLowerCase();
  const scope = SCOPE_MAP[key];
  if (!scope) {
    throw AppError.validation(
      `Entidad CERIF desconocida: '${raw}'. Valores permitidos: ` +
        "todo, organizaciones, personas, proyectos, publicaciones, patentes.",
    );
  }
  return scope;
}

// ─── Mappers ────────────────────────────────────────────────────────────────

export function cerifOrgUnitFrom(org: OrgUnitInput, ocde: string[]): CerifOrgUnit {
  return {
    id_org_unit: org.id_org_unit,
    nombre: org.nombre,
    tipo_organizacion: org.tipo_organizacion,
    tipo_dependencia: org.tipo_dependencia,
    naturaleza: naturalezaToSkos(org.es_publica),
    es_publica: org.es_publica,
    ruc: org.ruc,
    ror_id: org.ror_id,
    isni_id: org.isni_id,
    scopus_id: org.scopus_id,
    ubigeo_codigo: org.ubigeo_codigo,
    sector_institucional: org.sector_institucional,
    tipo_educacion_superior: org.tipo_educacion_superior,
    ciiu_codigo: org.ciiu_codigo,
    parent_id: org.parent_id,
    campos_ocde: ocde,
    ...(org.perucris_uuid ? { perucris_uuid: org.perucris_uuid } : {}),
    ...(org.perucris_handle ? { perucris_handle: org.perucris_handle } : {}),
  };
}

export function cerifPersonFrom(persona: PersonaInput, inv: InvestigadorInput): CerifPerson {
  return {
    id_persona: persona.id_persona,
    id_investigador: inv.id_investigador,
    dni: persona.dni,
    tipo_documento: inv.tipo_documento,
    nombres: persona.nombres,
    apellido_paterno: persona.apellido_paterno,
    apellido_materno: persona.apellido_materno,
    nombre_completo: persona.nombre_completo,
    sexo_skos: generoToSkos(persona.sexo) ?? null,
    orcid: inv.renacyt_orcid,
    scopus_author_id: inv.renacyt_scopus_author_id,
    renacyt_codigo_registro: inv.renacyt_codigo_registro,
    renacyt_nivel: inv.renacyt_nivel,
  };
}

export function cerifProyectoFrom(
  proyecto: ProyectoInput,
  participaciones: ParticipacionInput[],
  personas: Map<string, PersonaInput>,
  investigadoresMap: Map<string, InvestigadorInput>,
  financiamientos: Array<{ pivot: FinanciamientoPivotInput; fin: FinanciamientoInput }>,
  organizaciones: CerifProyectoOrganizacion[],
  ocde: string[],
): CerifProyecto {
  const participantes: CerifParticipante[] = participaciones.map((p) => {
    const inv = investigadoresMap.get(p.id_investigador);
    const persona = inv ? personas.get(inv.persona_id) : undefined;
    return {
      id_investigador: p.id_investigador,
      id_persona: persona?.id_persona ?? null,
      nombre_completo: persona?.nombre_completo ?? null,
      rol: p.rol,
      es_responsable: p.es_responsable,
      id_org_unit_afiliacion: p.id_org_unit_afiliacion,
      horas_dedicacion_semanal: p.horas_dedicacion_semanal,
    };
  });

  const fins: CerifProyectoFinanciamiento[] = financiamientos.map(({ pivot, fin }) => ({
    id_financiamiento: fin.id_financiamiento,
    codigo: fin.codigo,
    nombre: fin.nombre,
    modalidad: fin.modalidad,
    id_org_unit_financiadora: fin.id_org_unit_financiadora,
    monto_asignado: pivot.monto_asignado,
    moneda: pivot.moneda,
    monto: fin.monto,
  }));

  return {
    id_proyecto: proyecto.id_proyecto,
    titulo: proyecto.titulo_proyecto,
    codigo: proyecto.codigo,
    tipo_actividad_ocde: proyecto.tipo_actividad_ocde,
    ambito_geografico: proyecto.ambito_geografico,
    estado_concytec: proyecto.estado_concytec,
    tematica_ambiental: proyecto.tematica_ambiental,
    tematica_salud: proyecto.tematica_salud,
    campo_ocde: proyecto.campo_ocde,
    programas_relacionados: proyecto.programas_relacionados,
    campos_ocde: ocde,
    participantes,
    financiamientos: fins,
    organizaciones,
    ...(proyecto.perucris_uuid ? { perucris_uuid: proyecto.perucris_uuid } : {}),
  };
}

export function cerifPublicacionFrom(
  pub: PublicacionInput,
  autores: PublicacionAutorInput[],
  personas: Map<string, PersonaInput>,
): CerifPublicacion {
  const sorted = [...autores].sort((a, b) => a.orden - b.orden);
  const autoresCerif: CerifAutor[] = sorted.map((a) => ({
    id_persona: a.id_persona,
    nombre_completo: personas.get(a.id_persona)?.nombre_completo ?? "",
    orden: a.orden,
    es_autor_correspondiente: a.es_autor_correspondiente,
    id_org_unit_afiliacion: a.id_org_unit_afiliacion,
  }));

  return {
    id_publicacion: pub.id_publicacion,
    titulo: pub.titulo,
    tipo: pub.tipo,
    doi: pub.doi,
    issn: pub.issn,
    isbn: pub.isbn,
    anio: pub.anio,
    fecha_publicacion: pub.fecha_publicacion,
    revista_titulo: pub.revista_titulo,
    editorial: pub.editorial,
    id_org_unit_editora: pub.id_org_unit_editora,
    volumen: pub.volumen,
    numero_issue: pub.numero_issue,
    paginas: pub.paginas,
    idioma: pub.idioma,
    resumen: pub.resumen,
    palabras_clave: pub.palabras_clave,
    acceso_abierto: pub.acceso_abierto,
    scimago_cuartil: pub.scimago_cuartil,
    wos_cuartil: pub.wos_cuartil,
    es_revisado_por_pares: pub.es_revisado_por_pares,
    handle_url: pub.handle_url,
    estado_publicacion: pub.estado_publicacion,
    dominio_origen: pub.dominio_origen,
    pure_uuid: pub.pure_uuid,
    id_proyecto: pub.id_proyecto,
    autores: autoresCerif,
  };
}

export function cerifPatenteFrom(
  patente: PatenteInput,
  inventores: PatenteInventorInput[],
  titulares: PatenteTitularInput[],
  personas: Map<string, PersonaInput>,
  orgUnits: Map<string, OrgUnitInput>,
  ocde: string[],
): CerifPatente {
  const sortedInv = [...inventores].sort((a, b) => a.orden - b.orden);
  const inventoresCerif: CerifPersonaRef[] = sortedInv.map((i) => ({
    id_persona: i.id_persona,
    nombre_completo: personas.get(i.id_persona)?.nombre_completo ?? "",
  }));

  const titularesCerif: CerifTitular[] = titulares.map((t) => {
    let nombre: string | null = null;
    if (t.holder_type === "ORG_UNIT" && t.id_org_unit) {
      nombre = orgUnits.get(t.id_org_unit)?.nombre ?? null;
    } else if (t.id_persona) {
      nombre = personas.get(t.id_persona)?.nombre_completo ?? null;
    }
    return {
      holder_type: t.holder_type,
      id_org_unit: t.id_org_unit,
      id_persona: t.id_persona,
      nombre,
    };
  });

  return {
    id_patente: patente.id_patente,
    titulo: patente.titulo,
    numero_patente: patente.numero_patente,
    tipo: patente.tipo,
    estado: patente.estado,
    fecha_solicitud: patente.fecha_solicitud,
    fecha_concesion: patente.fecha_concesion,
    pais: patente.pais,
    entidad_concedente: patente.entidad_concedente,
    id_org_unit_concedente: patente.id_org_unit_concedente,
    clasificacion_ipc: patente.clasificacion_ipc,
    descripcion: patente.descripcion,
    proyecto_id: patente.proyecto_id,
    inventores: inventoresCerif,
    titulares: titularesCerif,
    campos_ocde: ocde,
  };
}
