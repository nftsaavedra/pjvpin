import {
  parseScope,
  cerifOrgUnitFrom,
  cerifPersonFrom,
  cerifProyectoFrom,
  cerifPublicacionFrom,
  cerifPatenteFrom,
  type OrgUnitInput,
  type PersonaInput,
  type InvestigadorInput,
  type ProyectoInput,
  type ParticipacionInput,
  type FinanciamientoPivotInput,
  type FinanciamientoInput,
  type PublicacionInput,
  type PublicacionAutorInput,
  type PatenteInput,
  type PatenteInventorInput,
  type PatenteTitularInput,
} from "./cerif.logic";

// ─── Helpers ────────────────────────────────────────────────────────────────

function org(overrides: Partial<OrgUnitInput> = {}): OrgUnitInput {
  return {
    id_org_unit: "org-1",
    nombre: "UNFV",
    tipo_organizacion: "universidad",
    tipo_dependencia: null,
    es_publica: true,
    ruc: null,
    ror_id: null,
    isni_id: null,
    scopus_id: null,
    ubigeo_codigo: null,
    sector_institucional: null,
    tipo_educacion_superior: null,
    ciiu_codigo: null,
    parent_id: null,
    perucris_uuid: null,
    perucris_handle: null,
    ...overrides,
  };
}

function persona(overrides: Partial<PersonaInput> = {}): PersonaInput {
  return {
    id_persona: "p-1",
    dni: "12345678",
    nombres: "Juan",
    apellido_paterno: "Perez",
    apellido_materno: "Gomez",
    nombre_completo: "Juan Perez Gomez",
    sexo: null,
    ...overrides,
  };
}

function investigador(overrides: Partial<InvestigadorInput> = {}): InvestigadorInput {
  return {
    id_investigador: "inv-1",
    persona_id: "p-1",
    tipo_documento: "DNI",
    renacyt_orcid: null,
    renacyt_scopus_author_id: null,
    renacyt_codigo_registro: null,
    renacyt_nivel: null,
    ...overrides,
  };
}

function proyecto(overrides: Partial<ProyectoInput> = {}): ProyectoInput {
  return {
    id_proyecto: "proy-1",
    titulo_proyecto: "Proyecto X",
    codigo: "PX-001",
    tipo_actividad_ocde: null,
    ambito_geografico: null,
    estado_concytec: null,
    tematica_ambiental: null,
    tematica_salud: null,
    campo_ocde: null,
    programas_relacionados: [],
    perucris_uuid: null,
    ...overrides,
  };
}

function publicacion(overrides: Partial<PublicacionInput> = {}): PublicacionInput {
  return {
    id_publicacion: "pub-1",
    titulo: "Estudio CERIF",
    tipo: "articulo",
    doi: null,
    issn: null,
    isbn: null,
    anio: 2024,
    fecha_publicacion: null,
    revista_titulo: null,
    editorial: null,
    id_org_unit_editora: null,
    volumen: null,
    numero_issue: null,
    paginas: null,
    idioma: "es",
    resumen: null,
    palabras_clave: ["cerif"],
    acceso_abierto: null,
    scimago_cuartil: null,
    wos_cuartil: null,
    es_revisado_por_pares: true,
    handle_url: null,
    estado_publicacion: null,
    dominio_origen: "MANUAL",
    pure_uuid: null,
    id_proyecto: null,
    ...overrides,
  };
}

function patente(overrides: Partial<PatenteInput> = {}): PatenteInput {
  return {
    id_patente: "pat-1",
    titulo: "Sistema X",
    numero_patente: "PE-001",
    tipo: "invencion",
    estado: null,
    fecha_solicitud: null,
    fecha_concesion: null,
    pais: "PE",
    entidad_concedente: null,
    id_org_unit_concedente: null,
    clasificacion_ipc: "A01B 1/00",
    descripcion: null,
    proyecto_id: "proy-1",
    ...overrides,
  };
}

// ─── parseScope ─────────────────────────────────────────────────────────────

describe("parseScope", () => {
  it("acepta valores válidos", () => {
    expect(parseScope(null)).toBe("todo");
    expect(parseScope(undefined)).toBe("todo");
    expect(parseScope("")).toBe("todo");
    expect(parseScope("todo")).toBe("todo");
    expect(parseScope("all")).toBe("todo");
    expect(parseScope("ORG_UNITS")).toBe("organizaciones");
    expect(parseScope("organizacion")).toBe("organizaciones");
    expect(parseScope("personas")).toBe("personas");
    expect(parseScope("investigador")).toBe("personas");
    expect(parseScope("Proyectos")).toBe("proyectos");
    expect(parseScope("publicacion")).toBe("publicaciones");
    expect(parseScope("patente")).toBe("patentes");
  });

  it("rechaza entidad desconocida", () => {
    expect(() => parseScope("vehiculos")).toThrow("Entidad CERIF desconocida");
  });
});

// ─── cerifOrgUnitFrom ───────────────────────────────────────────────────────

describe("cerifOrgUnitFrom", () => {
  it("mapea naturaleza y OCDE", () => {
    const o = org({ ruc: "20123456789", es_publica: true });
    const c = cerifOrgUnitFrom(o, ["1.1", "1.2"]);
    expect(c.naturaleza).toBe("publica");
    expect(c.campos_ocde).toEqual(["1.1", "1.2"]);
    expect(c.es_publica).toBe(true);
    expect(c.ruc).toBe("20123456789");
  });

  it("incluye perucris_uuid y perucris_handle si presentes", () => {
    const o = org({ perucris_uuid: "uuid-1", perucris_handle: "handle-1" });
    const c = cerifOrgUnitFrom(o, []);
    expect(c.perucris_uuid).toBe("uuid-1");
    expect(c.perucris_handle).toBe("handle-1");
  });

  it("omite perucris_uuid si null", () => {
    const c = cerifOrgUnitFrom(org(), []);
    expect(c).not.toHaveProperty("perucris_uuid");
  });
});

// ─── cerifPersonFrom ────────────────────────────────────────────────────────

describe("cerifPersonFrom", () => {
  it("mapea género a SKOS", () => {
    const p = persona({ sexo: "F" });
    const inv = investigador();
    const c = cerifPersonFrom(p, inv);
    expect(c.dni).toBe("12345678");
    expect(c.sexo_skos).toBe("femenino");
    expect(c.tipo_documento).toBe("DNI");
    expect(c.id_investigador).toBe("inv-1");
  });

  it("sexo desconocido → null", () => {
    const p = persona({ sexo: "otro" });
    const c = cerifPersonFrom(p, investigador());
    expect(c.sexo_skos).toBeNull();
  });
});

// ─── cerifProyectoFrom ──────────────────────────────────────────────────────

describe("cerifProyectoFrom", () => {
  it("resuelve participantes con nombre_completo", () => {
    const personas = new Map([["p-1", persona()]]);
    const invs = new Map([["inv-1", investigador()]]);
    const parts: ParticipacionInput[] = [
      {
        id_investigador: "inv-1",
        id_proyecto: "proy-1",
        rol: "INVESTIGADOR_PRINCIPAL",
        es_responsable: true,
        id_org_unit_afiliacion: null,
        horas_dedicacion_semanal: 20,
      },
    ];
    const c = cerifProyectoFrom(proyecto(), parts, personas, invs, [], [], []);
    expect(c.participantes).toHaveLength(1);
    expect(c.participantes[0].nombre_completo).toBe("Juan Perez Gomez");
    expect(c.participantes[0].es_responsable).toBe(true);
  });

  it("incluye financiamientos con monto_asignado del pivot", () => {
    const pivot: FinanciamientoPivotInput = {
      id_financiamiento: "f-1",
      id_proyecto: "proy-1",
      monto_asignado: 5000,
      moneda: "PEN",
    };
    const fin: FinanciamientoInput = {
      id_financiamiento: "f-1",
      codigo: null,
      nombre: "FONDECYT",
      modalidad: null,
      id_org_unit_financiadora: null,
      monto: 10000,
    };
    const c = cerifProyectoFrom(
      proyecto(),
      [],
      new Map(),
      new Map(),
      [{ pivot, fin }],
      [],
      [],
    );
    expect(c.financiamientos).toHaveLength(1);
    expect(c.financiamientos[0].monto_asignado).toBe(5000);
    expect(c.financiamientos[0].moneda).toBe("PEN");
    expect(c.financiamientos[0].monto).toBe(10000);
  });
});

// ─── cerifPublicacionFrom ───────────────────────────────────────────────────

describe("cerifPublicacionFrom", () => {
  it("ordena autores por orden y resuelve nombres", () => {
    const personas = new Map([["p-1", persona()]]);
    const autores: PublicacionAutorInput[] = [
      {
        id_persona: "p-1",
        id_publicacion: "pub-1",
        orden: 2,
        es_autor_correspondiente: false,
        id_org_unit_afiliacion: null,
      },
      {
        id_persona: "p-1",
        id_publicacion: "pub-1",
        orden: 1,
        es_autor_correspondiente: true,
        id_org_unit_afiliacion: null,
      },
    ];
    const c = cerifPublicacionFrom(publicacion(), autores, personas);
    expect(c.autores).toHaveLength(2);
    expect(c.autores[0].orden).toBe(1);
    expect(c.autores[0].es_autor_correspondiente).toBe(true);
    expect(c.autores[0].nombre_completo).toBe("Juan Perez Gomez");
    expect(c.tipo).toBe("articulo");
    expect(c.idioma).toBe("es");
  });
});

// ─── cerifPatenteFrom ───────────────────────────────────────────────────────

describe("cerifPatenteFrom", () => {
  it("mapea inventores y titulares con nombres", () => {
    const personas = new Map([["p-1", persona()]]);
    const orgs = new Map<string, OrgUnitInput>([["org-1", org()]]);
    const invs: PatenteInventorInput[] = [
      { id_persona: "p-1", id_patente: "pat-1", orden: 1 },
    ];
    const tits: PatenteTitularInput[] = [
      {
        holder_type: "ORG_UNIT",
        id_org_unit: "org-1",
        id_persona: null,
        id_patente: "pat-1",
        orden: 1,
      },
    ];
    const c = cerifPatenteFrom(patente(), invs, tits, personas, orgs, ["2.3"]);
    expect(c.inventores).toHaveLength(1);
    expect(c.inventores[0].nombre_completo).toBe("Juan Perez Gomez");
    expect(c.titulares[0].nombre).toBe("UNFV");
    expect(c.titulares[0].holder_type).toBe("ORG_UNIT");
    expect(c.campos_ocde).toEqual(["2.3"]);
    expect(c.proyecto_id).toBe("proy-1");
  });
});
