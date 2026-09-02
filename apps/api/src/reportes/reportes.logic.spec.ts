/**
 * Tests de la logica pura del modulo `reportes`.
 *
 * Cubre los 6 datasets de exportacion (proyecciones + orden), los 3 builders
 * integrales (armado anidado, desglose financiero, 404) y la resolucion de
 * catalogos. Todo se ejecuta sin MongoDB: los repositorios se representan por
 * los documentos que devuelven.
 */
import { AppError } from "../infra/errors/app-error";
import {
  buildCatalogoMap,
  resolveEstadoPatenteNombre,
  resolveMonedaNombre,
  resolveTipoFinanciamientoNombre,
  type CatalogoMap,
} from "./catalogo.helper";
import {
  buildReporteInvestigadorIntegral,
  buildReporteProyectoIntegral,
  buildReportesInvestigadoresIntegral,
  buildResumenFinanciero,
  indexById,
  joinOrNone,
  mapFinanciamientoConEtiquetas,
  mapPatenteConEtiquetas,
  proyectarAgrupadaInvestigador,
  proyectarGrupos,
  proyectarInvestigadoresPerfil,
  proyectarPlana,
  proyectarProyectosArea,
  proyectarRecursos,
  resolveGradoNombre,
  resolveRenacytNivel,
  type ReporteInvestigadorInput,
  type ReporteProyectoInput,
} from "./reportes.logic";
import type {
  EquipamientoReporteDoc,
  FinanciamientoReporteDoc,
  GradoReporteDoc,
  GrupoReporteDoc,
  InvestigadorReporteDoc,
  ParticipacionReporteDoc,
  PatenteReporteDoc,
  PersonaReporteDoc,
  ProyectoReporteDoc,
  PublicacionReporteDoc,
} from "./reportes.docs";

// ═══════════════════════════════════════════════════════════════════
// Fixtures
// ═══════════════════════════════════════════════════════════════════

const CATALOGO_MAP: CatalogoMap = buildCatalogoMap([
  { tipo: "moneda", codigo: "PEN", nombre: "Soles" },
  { tipo: "moneda", codigo: "USD", nombre: "Dolares" },
  { tipo: "estado_patente", codigo: "concedida", nombre: "Concedida" },
  { tipo: "tipo_patente", codigo: "invencion", nombre: "Patente de invencion" },
  { tipo: "tipo_financiamiento", codigo: "publico", nombre: "Fondo publico" },
  { tipo: "estado_financiero", codigo: "ejecucion", nombre: "En ejecucion" },
]);

function grado(id: string, nombre: string): GradoReporteDoc {
  return { id_grado: id, nombre };
}

function persona(id: string, dni: string, nombre: string): PersonaReporteDoc {
  return {
    id_persona: id,
    dni,
    nombres: nombre.split(" ")[0] ?? null,
    apellido_paterno: nombre.split(" ")[1] ?? null,
    apellido_materno: null,
    nombre_completo: nombre,
  };
}

function investigador(
  id: string,
  overrides: Partial<InvestigadorReporteDoc> = {},
): InvestigadorReporteDoc {
  return {
    id_investigador: id,
    id_persona: `persona-${id}`,
    id_grado: "grado-mg",
    activo: 1,
    updated_at: 1_700_000_000_000,
    dni: null,
    nombres: null,
    apellido_paterno: null,
    apellido_materno: null,
    nombre_completo: null,
    grupo_investigacion_id: null,
    renacyt_codigo_registro: null,
    renacyt_id_investigador: null,
    renacyt_nivel: null,
    renacyt_grupo: null,
    renacyt_condicion: null,
    renacyt_fecha_informe_calificacion: null,
    renacyt_fecha_registro: null,
    renacyt_fecha_ultima_revision: null,
    renacyt_fecha_ultima_sincronizacion: null,
    renacyt_orcid: null,
    renacyt_scopus_author_id: null,
    renacyt_ficha_url: null,
    renacyt_formaciones_academicas_json: null,
    ...overrides,
  };
}

function proyecto(
  id: string,
  titulo: string,
  overrides: Partial<ProyectoReporteDoc> = {},
): ProyectoReporteDoc {
  return {
    id_proyecto: id,
    titulo_proyecto: titulo,
    activo: 1,
    campo_ocde: null,
    programas_relacionados: [],
    updated_at: 1_700_000_000_000,
    ...overrides,
  };
}

function participacion(
  idProyecto: string,
  idInvestigador: string,
  esResponsable = false,
): ParticipacionReporteDoc {
  return {
    id_proyecto: idProyecto,
    id_investigador: idInvestigador,
    es_responsable: esResponsable,
  };
}

function patente(
  id: string,
  overrides: Partial<PatenteReporteDoc> = {},
): PatenteReporteDoc {
  return {
    id_patente: id,
    proyecto_id: null,
    titulo: `Patente ${id}`,
    numero_patente: null,
    tipo: "invencion",
    estado: "concedida",
    fecha_solicitud: null,
    fecha_concesion: null,
    pais: null,
    entidad_concedente: null,
    descripcion: null,
    ...overrides,
  };
}

function publicacion(
  id: string,
  overrides: Partial<PublicacionReporteDoc> = {},
): PublicacionReporteDoc {
  return {
    id_publicacion: id,
    titulo: `Publicacion ${id}`,
    tipo: "articulo",
    doi: null,
    anio: 2025,
    revista_titulo: null,
    issn: null,
    estado_publicacion: null,
    pure_uuid: null,
    dominio_origen: "MANUAL",
    es_revisado_por_pares: false,
    resumen: null,
    idioma: null,
    acceso_abierto: null,
    fecha_publicacion: null,
    id_proyecto: null,
    ...overrides,
  };
}

function equipamiento(
  id: string,
  overrides: Partial<EquipamientoReporteDoc> = {},
): EquipamientoReporteDoc {
  return {
    id_equipamiento: id,
    nombre: `Equipo ${id}`,
    descripcion: null,
    especificaciones: null,
    valor_estimado: null,
    moneda: null,
    proveedor: null,
    fecha_adquisicion: null,
    id_financiamiento: null,
    ...overrides,
  };
}

function financiamiento(
  id: string,
  overrides: Partial<FinanciamientoReporteDoc> = {},
): FinanciamientoReporteDoc {
  return {
    id_financiamiento: id,
    nombre: `Fondo ${id}`,
    tipo: null,
    monto: null,
    moneda: null,
    fecha_inicio: null,
    fecha_fin: null,
    descripcion: null,
    estado_financiero: null,
    id_org_unit_financiadora: null,
    ...overrides,
  };
}

function grupo(
  id: string,
  nombre: string,
  overrides: Partial<GrupoReporteDoc> = {},
): GrupoReporteDoc {
  return {
    id_grupo: id,
    nombre,
    descripcion: null,
    coordinador_id: null,
    lineas_investigacion: null,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════
// Helpers de resolucion
// ═══════════════════════════════════════════════════════════════════

describe("helpers de resolucion (port shared::data_loader)", () => {
  const grados = indexById([grado("grado-mg", "Magister")], (g) => g.id_grado);

  it("resolveGradoNombre devuelve el nombre cuando el grado existe", () => {
    expect(resolveGradoNombre(grados, "grado-mg")).toBe("Magister");
  });

  it("resolveGradoNombre devuelve 'Sin grado' con id ausente o desconocido", () => {
    expect(resolveGradoNombre(grados, null)).toBe("Sin grado");
    expect(resolveGradoNombre(grados, "grado-x")).toBe("Sin grado");
  });

  it("resolveRenacytNivel normaliza null/blank a 'No registrado'", () => {
    expect(resolveRenacytNivel(investigador("i1"))).toBe("No registrado");
    expect(resolveRenacytNivel(investigador("i1", { renacyt_nivel: "   " }))).toBe(
      "No registrado",
    );
    expect(resolveRenacytNivel(investigador("i1", { renacyt_nivel: "III" }))).toBe("III");
  });

  it("joinOrNone devuelve null con lista vacia", () => {
    expect(joinOrNone([], " | ")).toBeNull();
    expect(joinOrNone(["a", "b"], " | ")).toBe("a | b");
  });
});

// ═══════════════════════════════════════════════════════════════════
// Resolucion de catalogos
// ═══════════════════════════════════════════════════════════════════

describe("catalogo.helper", () => {
  it("resolveMonedaNombre resuelve el codigo contra el catalogo 'moneda'", () => {
    expect(resolveMonedaNombre(CATALOGO_MAP, "PEN")).toBe("Soles");
    expect(resolveMonedaNombre(CATALOGO_MAP, "USD")).toBe("Dolares");
  });

  it("resolveMonedaNombre devuelve null con codigo null o no catalogado", () => {
    expect(resolveMonedaNombre(CATALOGO_MAP, null)).toBeNull();
    expect(resolveMonedaNombre(CATALOGO_MAP, "EUR")).toBeNull();
  });

  it("resolveEstadoPatenteNombre resuelve contra 'estado_patente'", () => {
    expect(resolveEstadoPatenteNombre(CATALOGO_MAP, "concedida")).toBe("Concedida");
    // El codigo existe en otro tipo de catalogo: no debe cruzarse.
    expect(resolveEstadoPatenteNombre(CATALOGO_MAP, "PEN")).toBeNull();
  });

  it("resolveTipoFinanciamientoNombre resuelve contra 'tipo_financiamiento'", () => {
    expect(resolveTipoFinanciamientoNombre(CATALOGO_MAP, "publico")).toBe(
      "Fondo publico",
    );
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dataset 1 — plana
// ═══════════════════════════════════════════════════════════════════

describe("proyectarPlana", () => {
  const grados = indexById([grado("grado-mg", "Magister")], (g) => g.id_grado);
  const personas = indexById(
    [persona("persona-i1", "11111111", "Ana Perez"), persona("persona-i2", "22222222", "Beto Diaz")],
    (p) => p.id_persona,
  );

  it("proyecta una fila por participacion valida", () => {
    const data = proyectarPlana({
      grados,
      investigadores: indexById(
        [investigador("i1", { renacyt_nivel: "III" }), investigador("i2")],
        (i) => i.id_investigador,
      ),
      personas,
      proyectos: indexById([proyecto("p1", "Proyecto Alfa")], (p) => p.id_proyecto),
      participaciones: [participacion("p1", "i1"), participacion("p1", "i2")],
    });

    expect(data).toEqual([
      {
        proyecto: "Proyecto Alfa",
        grado: "Magister",
        renacyt_nivel: "III",
        investigador: "Ana Perez",
        dni: "11111111",
      },
      {
        proyecto: "Proyecto Alfa",
        grado: "Magister",
        renacyt_nivel: "No registrado",
        investigador: "Beto Diaz",
        dni: "22222222",
      },
    ]);
  });

  it("descarta proyectos inactivos, investigadores inactivos y referencias huerfanas", () => {
    const data = proyectarPlana({
      grados,
      investigadores: indexById(
        [investigador("i1"), investigador("i2", { activo: 0 })],
        (i) => i.id_investigador,
      ),
      personas,
      proyectos: indexById(
        [proyecto("p1", "Alfa", { activo: 0 }), proyecto("p2", "Beta")],
        (p) => p.id_proyecto,
      ),
      participaciones: [
        participacion("p1", "i1"), // proyecto inactivo
        participacion("p2", "i2"), // investigador inactivo
        participacion("p9", "i1"), // proyecto inexistente
        participacion("p2", "i9"), // investigador inexistente
      ],
    });
    expect(data).toEqual([]);
  });

  it("ordena por proyecto y luego por investigador", () => {
    const data = proyectarPlana({
      grados,
      investigadores: indexById(
        [investigador("i1"), investigador("i2")],
        (i) => i.id_investigador,
      ),
      personas,
      proyectos: indexById(
        [proyecto("p1", "Zeta"), proyecto("p2", "Alfa")],
        (p) => p.id_proyecto,
      ),
      participaciones: [
        participacion("p1", "i2"),
        participacion("p2", "i2"),
        participacion("p2", "i1"),
      ],
    });
    expect(data.map((d) => [d.proyecto, d.investigador])).toEqual([
      ["Alfa", "Ana Perez"],
      ["Alfa", "Beto Diaz"],
      ["Zeta", "Beto Diaz"],
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dataset 2 — agrupada por investigador
// ═══════════════════════════════════════════════════════════════════

describe("proyectarAgrupadaInvestigador", () => {
  it("agrupa y concatena los proyectos activos de cada investigador activo", () => {
    const data = proyectarAgrupadaInvestigador({
      grados: indexById([grado("grado-mg", "Magister")], (g) => g.id_grado),
      grupos: indexById([grupo("g1", "Grupo Uno")], (g) => g.id_grupo),
      investigadoresActivos: [
        investigador("i1", { grupo_investigacion_id: "g1" }),
        investigador("i2"),
      ],
      personas: indexById(
        [
          persona("persona-i1", "11111111", "Ana Perez"),
          persona("persona-i2", "22222222", "Beto Diaz"),
        ],
        (p) => p.id_persona,
      ),
      proyectos: indexById(
        [
          proyecto("p1", "Alfa"),
          proyecto("p2", "Beta"),
          proyecto("p3", "Gamma", { activo: 0 }),
        ],
        (p) => p.id_proyecto,
      ),
      participaciones: [
        participacion("p1", "i1"),
        participacion("p2", "i1"),
        participacion("p3", "i1"), // inactivo: no cuenta
        participacion("p1", "i3"), // investigador no activo/inexistente
      ],
    });

    expect(data).toEqual([
      {
        investigador: "Ana Perez",
        dni: "11111111",
        grado: "Magister",
        renacyt_nivel: "No registrado",
        grupo_investigacion: "Grupo Uno",
        cantidad_proyectos: 2,
        proyectos: "Alfa | Beta",
      },
      {
        investigador: "Beto Diaz",
        dni: "22222222",
        grado: "Magister",
        renacyt_nivel: "No registrado",
        grupo_investigacion: null,
        cantidad_proyectos: 0,
        proyectos: null,
      },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dataset 3 — grupos
// ═══════════════════════════════════════════════════════════════════

describe("proyectarGrupos", () => {
  it("cuenta miembros y proyectos activos del grupo, con coordinador resuelto", () => {
    const data = proyectarGrupos({
      grupos: [
        grupo("g2", "Zeta", { lineas_investigacion: ["IA"] }),
        grupo("g1", "Alfa", {
          descripcion: "Grupo alfa",
          coordinador_id: "i1",
          lineas_investigacion: ["Datos", "Redes"],
        }),
      ],
      investigadores: indexById(
        [
          investigador("i1", { grupo_investigacion_id: "g1" }),
          investigador("i2", { grupo_investigacion_id: "g1" }),
          investigador("i3", { grupo_investigacion_id: null }),
        ],
        (i) => i.id_investigador,
      ),
      personas: indexById(
        [
          persona("persona-i1", "11111111", "Ana Perez"),
          persona("persona-i2", "22222222", "Beto Diaz"),
          persona("persona-i3", "33333333", "Caro Ruiz"),
        ],
        (p) => p.id_persona,
      ),
      proyectos: indexById(
        [proyecto("p1", "Beta"), proyecto("p2", "Alfa"), proyecto("p3", "Gamma", { activo: 0 })],
        (p) => p.id_proyecto,
      ),
      participaciones: [
        participacion("p1", "i1"),
        participacion("p2", "i2"),
        participacion("p3", "i2"),
        participacion("p1", "i3"),
      ],
    });

    expect(data.map((d) => d.grupo)).toEqual(["Alfa", "Zeta"]);
    expect(data[0]).toEqual({
      grupo: "Alfa",
      descripcion: "Grupo alfa",
      coordinador: "Ana Perez",
      cantidad_miembros: 2,
      miembros: "Ana Perez | Beto Diaz",
      lineas_investigacion: ["Datos", "Redes"],
      cantidad_proyectos: 2,
      proyectos: "Alfa | Beta",
    });
    expect(data[1]).toEqual({
      grupo: "Zeta",
      descripcion: null,
      coordinador: null,
      cantidad_miembros: 0,
      miembros: null,
      lineas_investigacion: ["IA"],
      cantidad_proyectos: 0,
      proyectos: null,
    });
  });

  it("normaliza lineas_investigacion ausente a lista vacia", () => {
    const data = proyectarGrupos({
      grupos: [grupo("g1", "Alfa")],
      investigadores: new Map(),
      personas: new Map(),
      proyectos: new Map(),
      participaciones: [],
    });
    expect(data[0]?.lineas_investigacion).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dataset 4 — recursos
// ═══════════════════════════════════════════════════════════════════

describe("proyectarRecursos", () => {
  it("une patentes, software, equipamientos y financiamientos por tipo_recurso", () => {
    const data = proyectarRecursos({
      catalogoMap: CATALOGO_MAP,
      investigadores: indexById([investigador("i1")], (i) => i.id_investigador),
      personas: indexById(
        [persona("persona-i1", "11111111", "Ana Perez")],
        (p) => p.id_persona,
      ),
      proyectos: indexById([proyecto("p1", "Alfa")], (p) => p.id_proyecto),
      patentes: [patente("pat1", { proyecto_id: "p1", titulo: "Patente A" })],
      softwarePublicaciones: [
        publicacion("pub1", { titulo: "Sistema X", tipo: "software", id_proyecto: "p1" }),
      ],
      equipamientos: [
        equipamiento("eq1", {
          nombre: "Microscopio",
          moneda: "PEN",
          valor_estimado: 5000,
          id_financiamiento: "fin1",
        }),
      ],
      financiamientos: [
        financiamiento("fin1", {
          nombre: "Fondo interno",
          tipo: "publico",
          estado_financiero: "ejecucion",
          moneda: "USD",
          monto: 12000,
        }),
      ],
      patenteInventores: [
        { id_patente: "pat1", id_persona: "persona-i1" },
        { id_patente: "pat1", id_persona: "persona-i9" },
      ],
      orgUnits: [],
      proyectoFinanciamientos: [{ id_proyecto: "p1", id_financiamiento: "fin1" }],
    });

    expect(data).toEqual([
      {
        tipo_recurso: "Equipamiento",
        titulo_o_nombre: "Microscopio",
        proyecto: "Alfa",
        investigador: null,
        tipo: null,
        estado: null,
        moneda: "Soles",
        monto: 5000,
      },
      {
        tipo_recurso: "Financiamiento",
        titulo_o_nombre: "Fondo interno",
        proyecto: "Alfa",
        investigador: null,
        tipo: "Fondo publico",
        estado: "En ejecucion",
        moneda: "Dolares",
        monto: 12000,
      },
      {
        tipo_recurso: "Patente",
        titulo_o_nombre: "Patente A",
        proyecto: "Alfa",
        investigador: "Ana Perez",
        tipo: "Patente de invencion",
        estado: "Concedida",
        moneda: null,
        monto: null,
      },
      {
        tipo_recurso: "Software",
        titulo_o_nombre: "Sistema X",
        proyecto: "Alfa",
        investigador: null,
        tipo: "software",
        estado: null,
        moneda: null,
        monto: null,
      },
    ]);
  });

  it("prefiere el nombre de la org_unit financiadora sobre el nombre del fondo", () => {
    const data = proyectarRecursos({
      catalogoMap: CATALOGO_MAP,
      investigadores: new Map(),
      personas: new Map(),
      proyectos: new Map(),
      patentes: [],
      softwarePublicaciones: [],
      equipamientos: [],
      financiamientos: [
        financiamiento("fin1", {
          nombre: "Fondo interno",
          id_org_unit_financiadora: "org1",
        }),
      ],
      patenteInventores: [],
      orgUnits: [{ id_org_unit: "org1", nombre: "CONCYTEC" }],
      proyectoFinanciamientos: [],
    });
    expect(data[0]?.titulo_o_nombre).toBe("CONCYTEC");
    expect(data[0]?.proyecto).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dataset 5 — perfil de investigadores
// ═══════════════════════════════════════════════════════════════════

describe("proyectarInvestigadoresPerfil", () => {
  it("une grado, renacyt, grupo, proyectos activos y conteo de publicaciones", () => {
    const data = proyectarInvestigadoresPerfil({
      grados: indexById([grado("grado-mg", "Magister")], (g) => g.id_grado),
      grupos: indexById([grupo("g1", "Grupo Uno")], (g) => g.id_grupo),
      investigadores: [
        investigador("i2", { activo: 0 }),
        investigador("i1", {
          grupo_investigacion_id: "g1",
          renacyt_nivel: "II",
          renacyt_grupo: "Carlos Monge",
          renacyt_condicion: "Activo",
          renacyt_orcid: "0000-0002-1825-0097",
        }),
      ],
      personas: indexById(
        [
          persona("persona-i1", "11111111", "Ana Perez"),
          persona("persona-i2", "22222222", "Beto Diaz"),
        ],
        (p) => p.id_persona,
      ),
      proyectos: indexById(
        [proyecto("p1", "Zeta"), proyecto("p2", "Alfa"), proyecto("p3", "Gamma", { activo: 0 })],
        (p) => p.id_proyecto,
      ),
      participaciones: [
        participacion("p1", "i1"),
        participacion("p2", "i1"),
        participacion("p3", "i1"),
      ],
      publicacionAutores: [
        { id_publicacion: "pub1", id_persona: "persona-i1" },
        { id_publicacion: "pub2", id_persona: "persona-i1" },
        { id_publicacion: "pub3", id_persona: "persona-i9" },
      ],
    });

    // Orden alfabetico por nombre completo (case-insensitive).
    expect(data.map((d) => d.nombres_apellidos)).toEqual(["Ana Perez", "Beto Diaz"]);
    expect(data[0]).toEqual({
      dni: "11111111",
      nombres_apellidos: "Ana Perez",
      grado: "Magister",
      renacyt_nivel: "II",
      renacyt_grupo: "Carlos Monge",
      renacyt_condicion: "Activo",
      renacyt_orcid: "0000-0002-1825-0097",
      grupo_investigacion: "Grupo Uno",
      cantidad_proyectos: 2,
      cantidad_publicaciones: 2,
      proyectos: "Alfa | Zeta",
      activo: true,
    });
    expect(data[1]?.activo).toBe(false);
    expect(data[1]?.cantidad_publicaciones).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Dataset 6 — proyectos por area OCDE
// ═══════════════════════════════════════════════════════════════════

describe("proyectarProyectosArea", () => {
  it("agrupa por area con conteo de proyectos e investigadores unicos", () => {
    const data = proyectarProyectosArea({
      proyectosActivos: [
        proyecto("p1", "Beta", { campo_ocde: "Ingenieria" }),
        proyecto("p2", "Alfa", { campo_ocde: "Ingenieria" }),
        proyecto("p3", "Gamma"),
      ],
      participaciones: [
        participacion("p1", "i1"),
        participacion("p2", "i1"),
        participacion("p2", "i2"),
        participacion("p3", "i3"),
      ],
    });

    expect(data).toEqual([
      {
        area: "Ingenieria",
        cantidad_proyectos: 2,
        proyectos: "Alfa | Beta",
        cantidad_investigadores: 2,
      },
      {
        area: "Sin area OCDE",
        cantidad_proyectos: 1,
        proyectos: "Gamma",
        cantidad_investigadores: 1,
      },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Resumen financiero
// ═══════════════════════════════════════════════════════════════════

describe("buildResumenFinanciero", () => {
  it("desglosa por moneda y estado con totales acumulados", () => {
    const financiamientos = [
      financiamiento("f1", { moneda: "PEN", monto: 100, estado_financiero: "ejecucion" }),
      financiamiento("f2", { moneda: "PEN", monto: 50, estado_financiero: "ejecucion" }),
      financiamiento("f3", { moneda: "USD", monto: 20, estado_financiero: null }),
      financiamiento("f4", { moneda: null, monto: null, estado_financiero: null }),
    ].map((f) => mapFinanciamientoConEtiquetas(f, CATALOGO_MAP));

    const resumen = buildResumenFinanciero(financiamientos, CATALOGO_MAP);

    expect(resumen.total_financiamientos).toBe(4);
    expect(resumen.desglose_por_moneda).toEqual([
      { moneda_codigo: "PEN", moneda_nombre: "Soles", cantidad: 2, monto_total: 150 },
      { moneda_codigo: "USD", moneda_nombre: "Dolares", cantidad: 1, monto_total: 20 },
      {
        moneda_codigo: "sin_moneda",
        moneda_nombre: "Sin moneda",
        cantidad: 1,
        monto_total: 0,
      },
    ]);
    expect(resumen.desglose_por_estado).toEqual([
      { estado_codigo: "ejecucion", estado_nombre: "En ejecucion", cantidad: 2 },
      { estado_codigo: "sin_estado", estado_nombre: "Sin estado", cantidad: 2 },
    ]);
  });

  it("devuelve desgloses vacios sin financiamientos", () => {
    const resumen = buildResumenFinanciero([], CATALOGO_MAP);
    expect(resumen).toEqual({
      total_financiamientos: 0,
      desglose_por_moneda: [],
      desglose_por_estado: [],
    });
  });
});

// ═══════════════════════════════════════════════════════════════════
// Normalizacion undefined -> null (contrato `Option<T>` del Rust)
// ═══════════════════════════════════════════════════════════════════

describe("normalizacion de campos ausentes a null", () => {
  it("mapPatenteConEtiquetas emite null (no undefined) en campos ausentes", () => {
    const mapped = mapPatenteConEtiquetas(
      patente("pat1", {
        numero_patente: undefined,
        tipo: undefined,
        estado: undefined,
        fecha_solicitud: undefined,
        pais: undefined,
        descripcion: undefined,
      }),
      CATALOGO_MAP,
    );
    expect(JSON.parse(JSON.stringify(mapped))).toEqual({
      id_patente: "pat1",
      titulo: "Patente pat1",
      numero_patente: null,
      tipo_codigo: null,
      tipo_nombre: null,
      estado_codigo: null,
      estado_nombre: null,
      fecha_solicitud: null,
      fecha_concesion: null,
      pais: null,
      entidad_concedente: null,
      descripcion: null,
    });
  });

  it("proyectarInvestigadoresPerfil emite null en los campos RENACYT ausentes", () => {
    const [fila] = proyectarInvestigadoresPerfil({
      grados: new Map(),
      grupos: new Map(),
      investigadores: [
        investigador("i1", {
          renacyt_nivel: undefined,
          renacyt_grupo: undefined,
          renacyt_condicion: undefined,
          renacyt_orcid: undefined,
        }),
      ],
      personas: new Map(),
      proyectos: new Map(),
      participaciones: [],
      publicacionAutores: [],
    });
    expect(Object.keys(JSON.parse(JSON.stringify(fila)))).toContain("renacyt_nivel");
    expect(fila?.renacyt_nivel).toBeNull();
    expect(fila?.renacyt_grupo).toBeNull();
    expect(fila?.renacyt_condicion).toBeNull();
    expect(fila?.renacyt_orcid).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Integral — proyecto
// ═══════════════════════════════════════════════════════════════════

function proyectoInput(
  overrides: Partial<ReporteProyectoInput> = {},
): ReporteProyectoInput {
  return {
    proyecto: proyecto("p1", "Proyecto Alfa", {
      campo_ocde: "Ingenieria",
      programas_relacionados: ["PNIPA"],
      updated_at: 1_700_000_000_000,
    }),
    participaciones: [participacion("p1", "i1", true), participacion("p1", "i2")],
    investigadoresPorId: indexById(
      [
        investigador("i1", {
          grupo_investigacion_id: "g1",
          renacyt_nivel: "III",
          renacyt_codigo_registro: "P0001",
        }),
        investigador("i2"),
      ],
      (i) => i.id_investigador,
    ),
    publicacionesCountPorPersona: new Map([["persona-i1", 3]]),
    grados: indexById([grado("grado-mg", "Magister")], (g) => g.id_grado),
    grupos: indexById([grupo("g1", "Grupo Uno")], (g) => g.id_grupo),
    personas: indexById(
      [
        persona("persona-i1", "11111111", "Ana Perez"),
        persona("persona-i2", "22222222", "Beto Diaz"),
      ],
      (p) => p.id_persona,
    ),
    catalogoMap: CATALOGO_MAP,
    patentes: [patente("pat1", { proyecto_id: "p1" })],
    software: [publicacion("pub1", { tipo: "software", id_proyecto: "p1" })],
    equipamientos: [equipamiento("eq1", { moneda: "PEN", valor_estimado: 800 })],
    financiamientos: [
      financiamiento("fin1", {
        moneda: "PEN",
        monto: 1000,
        tipo: "publico",
        estado_financiero: "ejecucion",
      }),
      financiamiento("fin2", { moneda: "USD", monto: 500 }),
    ],
    ...overrides,
  };
}

describe("buildReporteProyectoIntegral", () => {
  it("arma cabecera, equipo, recursos y resumen financiero", () => {
    const reporte = buildReporteProyectoIntegral(proyectoInput());

    expect(reporte.cabecera).toEqual({
      id_proyecto: "p1",
      titulo_proyecto: "Proyecto Alfa",
      activo: true,
      campo_ocde: "Ingenieria",
      programas_relacionados: ["PNIPA"],
      fecha_creacion: null,
      fecha_actualizacion: "1700000000000",
    });

    expect(reporte.total_investigadores).toBe(2);
    expect(reporte.equipo[0]).toMatchObject({
      id_investigador: "i1",
      dni: "11111111",
      nombres_apellidos: "Ana Perez",
      grado_nombre: "Magister",
      grado_id: "grado-mg",
      es_responsable: true,
      renacyt_codigo_registro: "P0001",
      renacyt_nivel: "III",
      grupo_nombre: "Grupo Uno",
      grupo_id: "g1",
      publicaciones_count: 3,
    });
    expect(reporte.equipo[1]).toMatchObject({
      id_investigador: "i2",
      es_responsable: false,
      grupo_nombre: null,
      grupo_id: null,
      publicaciones_count: 0,
    });

    expect(reporte.total_patentes).toBe(1);
    expect(reporte.patentes[0]).toMatchObject({
      id_patente: "pat1",
      tipo_codigo: "invencion",
      tipo_nombre: "Patente de invencion",
      estado_codigo: "concedida",
      estado_nombre: "Concedida",
    });

    expect(reporte.total_software).toBe(1);
    expect(reporte.software_publicaciones[0]?.id_publicacion).toBe("pub1");

    expect(reporte.total_equipamientos).toBe(1);
    expect(reporte.equipamientos[0]).toMatchObject({
      moneda_codigo: "PEN",
      moneda_nombre: "Soles",
      valor_estimado: 800,
    });

    expect(reporte.total_financiamientos).toBe(2);
    expect(reporte.resumen_financiero.total_financiamientos).toBe(2);
    expect(reporte.resumen_financiero.desglose_por_moneda).toEqual([
      { moneda_codigo: "PEN", moneda_nombre: "Soles", cantidad: 1, monto_total: 1000 },
      { moneda_codigo: "USD", moneda_nombre: "Dolares", cantidad: 1, monto_total: 500 },
    ]);
    expect(reporte.resumen_financiero.desglose_por_estado).toEqual([
      { estado_codigo: "ejecucion", estado_nombre: "En ejecucion", cantidad: 1 },
      { estado_codigo: "sin_estado", estado_nombre: "Sin estado", cantidad: 1 },
    ]);
  });

  it("normaliza programas_relacionados ausente y updated_at null", () => {
    const reporte = buildReporteProyectoIntegral(
      proyectoInput({
        proyecto: proyecto("p1", "Alfa", {
          programas_relacionados: null,
          updated_at: null,
        }),
      }),
    );
    expect(reporte.cabecera.programas_relacionados).toEqual([]);
    expect(reporte.cabecera.fecha_actualizacion).toBeNull();
  });

  it("lanza AppError.notFound cuando el proyecto no existe", () => {
    expect(() => buildReporteProyectoIntegral(proyectoInput({ proyecto: null }))).toThrow(
      AppError,
    );
    expect(() => buildReporteProyectoIntegral(proyectoInput({ proyecto: null }))).toThrow(
      /Proyecto no encontrado/,
    );
  });

  it("lanza AppError.notFound cuando una participacion referencia un investigador ausente", () => {
    expect(() =>
      buildReporteProyectoIntegral(proyectoInput({ investigadoresPorId: new Map() })),
    ).toThrow(/Investigador no encontrado/);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Integral — investigador
// ═══════════════════════════════════════════════════════════════════

function investigadorInput(
  overrides: Partial<ReporteInvestigadorInput> = {},
): ReporteInvestigadorInput {
  return {
    investigador: investigador("i1", {
      grupo_investigacion_id: "g1",
      renacyt_nivel: "III",
      renacyt_orcid: "0000-0002-1825-0097",
      renacyt_fecha_ultima_sincronizacion: 1_699_000_000_000,
      updated_at: 1_700_000_000_000,
    }),
    grados: indexById([grado("grado-mg", "Magister")], (g) => g.id_grado),
    grupos: indexById([grupo("g1", "Grupo Uno")], (g) => g.id_grupo),
    personas: indexById(
      [
        persona("persona-i1", "11111111", "Ana Perez"),
        persona("persona-i2", "22222222", "Beto Diaz"),
      ],
      (p) => p.id_persona,
    ),
    catalogoMap: CATALOGO_MAP,
    investigadores: indexById(
      [investigador("i1"), investigador("i2")],
      (i) => i.id_investigador,
    ),
    proyectos: indexById(
      [proyecto("p1", "Alfa", { campo_ocde: "Ingenieria" })],
      (p) => p.id_proyecto,
    ),
    todasParticipaciones: [
      participacion("p1", "i1", true),
      participacion("p1", "i2"),
      participacion("p9", "i1"), // proyecto inexistente: se descarta
    ],
    recursosPorProyecto: new Map([
      ["p1", { patentes: 2, software: 1, equipamientos: 3, financiamientos: 4 }],
    ]),
    patentes: [patente("pat1")],
    software: [publicacion("pub1", { tipo: "software" })],
    equipamientos: [equipamiento("eq1", { moneda: "USD" })],
    publicaciones: [
      publicacion("pub1", { tipo: "software" }),
      publicacion("pub2", { doi: "10.1234/abc", dominio_origen: "PURE" }),
    ],
    ...overrides,
  };
}

describe("buildReporteInvestigadorIntegral", () => {
  it("arma perfil, proyectos con colegas, recursos, publicaciones y trazabilidad", () => {
    const reporte = buildReporteInvestigadorIntegral(investigadorInput());

    expect(reporte.perfil).toMatchObject({
      id_investigador: "i1",
      dni: "11111111",
      nombres_apellidos: "Ana Perez",
      grado_nombre: "Magister",
      grado_id: "grado-mg",
      renacyt_nivel: "III",
      renacyt_orcid: "0000-0002-1825-0097",
      grupo_nombre: "Grupo Uno",
      grupo_id: "g1",
    });

    expect(reporte.total_proyectos).toBe(1);
    expect(reporte.proyectos[0]).toMatchObject({
      id_proyecto: "p1",
      titulo_proyecto: "Alfa",
      es_responsable: true,
      activo: true,
      campo_ocde: "Ingenieria",
      programas_relacionados: [],
      recursos_en_proyecto: {
        patentes: 2,
        software: 1,
        equipamientos: 3,
        financiamientos: 4,
      },
    });
    expect(reporte.proyectos[0]?.colegas).toEqual([
      {
        id_investigador: "i2",
        nombres_apellidos: "Beto Diaz",
        grado_nombre: "Magister",
        es_responsable: false,
      },
    ]);

    expect(reporte.recursos.total_patentes).toBe(1);
    expect(reporte.recursos.total_software).toBe(1);
    expect(reporte.recursos.total_equipamientos).toBe(1);
    expect(reporte.recursos.equipamientos[0]?.moneda_nombre).toBe("Dolares");

    expect(reporte.total_publicaciones).toBe(2);
    expect(reporte.publicaciones[1]).toMatchObject({
      id_publicacion: "pub2",
      doi: "10.1234/abc",
      dominio_origen: "PURE",
    });

    expect(reporte.trazabilidad).toEqual({
      updated_at: 1_700_000_000_000,
      fecha_ultima_sincronizacion_renacyt: 1_699_000_000_000,
      fecha_ultima_sincronizacion_pure: null,
    });
  });

  it("usa conteos en cero cuando el proyecto no tiene resumen precalculado", () => {
    const reporte = buildReporteInvestigadorIntegral(
      investigadorInput({ recursosPorProyecto: new Map() }),
    );
    expect(reporte.proyectos[0]?.recursos_en_proyecto).toEqual({
      patentes: 0,
      software: 0,
      equipamientos: 0,
      financiamientos: 0,
    });
  });

  it("lanza AppError.notFound cuando el investigador no existe", () => {
    expect(() =>
      buildReporteInvestigadorIntegral(investigadorInput({ investigador: null })),
    ).toThrow(/Investigador no encontrado/);
  });
});

describe("buildReportesInvestigadoresIntegral", () => {
  it("construye un reporte por investigador de la lista", () => {
    const reportes = buildReportesInvestigadoresIntegral([
      investigadorInput(),
      investigadorInput({
        investigador: investigador("i2", { grupo_investigacion_id: null }),
        patentes: [],
        software: [],
        equipamientos: [],
        publicaciones: [],
      }),
    ]);

    expect(reportes).toHaveLength(2);
    expect(reportes[0]?.perfil.id_investigador).toBe("i1");
    expect(reportes[1]?.perfil.id_investigador).toBe("i2");
    expect(reportes[1]?.perfil.nombres_apellidos).toBe("Beto Diaz");
    expect(reportes[1]?.perfil.grupo_nombre).toBeNull();
    expect(reportes[1]?.total_publicaciones).toBe(0);
    expect(reportes[1]?.recursos.total_patentes).toBe(0);
  });

  it("devuelve lista vacia sin investigadores", () => {
    expect(buildReportesInvestigadoresIntegral([])).toEqual([]);
  });
});
