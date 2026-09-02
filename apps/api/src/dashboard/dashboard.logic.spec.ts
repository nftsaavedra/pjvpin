/**
 * Tests de funciones puras del módulo `dashboard`. Cubre los 4 algoritmos
 * del backend Rust `apps/desktop/src-tauri/src/proyectos/repository_stats.rs`:
 *   - `calcularEstadisticas` (conteo proyectos ACTIVOS por investigador,
 *     orden cantidad desc + nombre asc).
 *   - `calcularKpis` (totales + desglose con_1 / multiples).
 *   - `calcularTrend` (agrupacion (anio, mes) desde `updated_at`, orden
 *     ascendente).
 *   - `calcularRenacytDistribucion` (agrupacion por nivel, con/sin proyectos
 *     ACTIVOS, orden nivel case-insensitive asc).
 */
import {
  calcularEstadisticas,
  calcularKpis,
  calcularRenacytDistribucion,
  calcularTrend,
  resolveRenacytNivel,
} from "./dashboard.logic";
import type {
  InvestigadorLiteDoc,
  ParticipacionLiteDoc,
  PersonaLiteDoc,
  ProyectoLiteDoc,
} from "./dashboard.repository";

// ============================================================
// Helpers de fixtures
// ============================================================

function inv(
  id_investigador: string,
  id_persona: string,
  renacyt_nivel: string | null = null,
): InvestigadorLiteDoc {
  return { id_investigador, id_persona, renacyt_nivel };
}

function persona(id_persona: string, nombre_completo: string): PersonaLiteDoc {
  return { id_persona, nombre_completo };
}

function proyecto(
  id_proyecto: string,
  updated_at: number | null = 1700000000000,
): ProyectoLiteDoc {
  return { id_proyecto, updated_at };
}

function part(
  id_proyecto: string,
  id_investigador: string,
): ParticipacionLiteDoc {
  return { id_proyecto, id_investigador };
}

// ============================================================
// resolveRenacytNivel
// ============================================================

describe("resolveRenacytNivel", () => {
  it.each([
    ["Carlos", "Carlos"],
    ["Maria", "Maria"],
    ["Investigador Distinguido", "Investigador Distinguido"],
  ])("devuelve el nivel cuando no es vacio: '%s' → '%s'", (input, expected) => {
    expect(resolveRenacytNivel(inv("i1", "p1", input))).toBe(expected);
  });

  // El comportamiento replica el Rust: se considera vacio si el valor es
  // whitespace-only, pero NO se trimea el valor devuelto. Esto preserva el
  // shape original para agrupaciones case-insensitive.
  it("valor con whitespace interno o en bordes se devuelve tal cual (sin trim)", () => {
    expect(resolveRenacytNivel(inv("i1", "p1", "  Carlos  "))).toBe("  Carlos  ");
    expect(resolveRenacytNivel(inv("i1", "p1", "Carlos Ramirez"))).toBe(
      "Carlos Ramirez",
    );
  });

  it.each([null, "", "   ", "\t\n"])(
    "nivel ausente/empty/whitespace → 'No registrado' (input=%s)",
    (value) => {
      expect(resolveRenacytNivel(inv("i1", "p1", value as string | null))).toBe(
        "No registrado",
      );
    },
  );
});

// ============================================================
// calcularEstadisticas
// ============================================================

describe("calcularEstadisticas", () => {
  it("cuenta solo proyectos activos y ordena por cantidad desc + nombre asc", () => {
    const investigadores = [
      inv("i1", "p1"),
      inv("i2", "p2"),
      inv("i3", "p3"),
    ];
    const proyectosMap = new Map<string, ProyectoLiteDoc>([
      ["proj-A", proyecto("proj-A")],
      ["proj-B", proyecto("proj-B")],
      ["proj-C", proyecto("proj-C")],
    ]);
    const participaciones = [
      part("proj-A", "i1"),
      part("proj-B", "i1"),
      part("proj-C", "i1"), // i1 → 3
      part("proj-A", "i2"), // i2 → 1
      part("proj-B", "i3"), // i3 → 1
      // i2 con un proyecto inactivo (NO entra en proyectosMap)
      part("proj-INACTIVE", "i2"),
    ];
    const personasMap = new Map<string, PersonaLiteDoc>([
      ["p1", persona("p1", "Carlos")],
      ["p2", persona("p2", "Ana")],
      ["p3", persona("p3", "Beatriz")],
    ]);

    const stats = calcularEstadisticas(
      investigadores,
      proyectosMap,
      participaciones,
      personasMap,
    );

    expect(stats).toEqual([
      { nombre: "Carlos", cantidad: 3 },
      { nombre: "Ana", cantidad: 1 },
      { nombre: "Beatriz", cantidad: 1 },
    ]);
  });

  it("investigadores sin nombre (persona no encontrada) → string vacio", () => {
    const investigadores = [inv("i1", "p-missing")];
    const proyectosMap = new Map<string, ProyectoLiteDoc>();
    const participaciones: ParticipacionLiteDoc[] = [];
    const personasMap = new Map<string, PersonaLiteDoc>();

    const stats = calcularEstadisticas(
      investigadores,
      proyectosMap,
      participaciones,
      personasMap,
    );

    expect(stats).toEqual([{ nombre: "", cantidad: 0 }]);
  });

  it("investigadores sin proyectos mantienen entrada con cantidad=0", () => {
    const investigadores = [inv("i1", "p1"), inv("i2", "p2")];
    const proyectosMap = new Map<string, ProyectoLiteDoc>();
    const participaciones: ParticipacionLiteDoc[] = [];
    const personasMap = new Map<string, PersonaLiteDoc>([
      ["p1", persona("p1", "Investigador X")],
      ["p2", persona("p2", "Investigador Y")],
    ]);

    const stats = calcularEstadisticas(
      investigadores,
      proyectosMap,
      participaciones,
      personasMap,
    );

    expect(stats).toHaveLength(2);
    expect(stats.every((s) => s.cantidad === 0)).toBe(true);
  });

  it("empate en cantidad: desempata por nombre asc", () => {
    const investigadores = [
      inv("i1", "p1"),
      inv("i2", "p2"),
      inv("i3", "p3"),
    ];
    const proyectosMap = new Map<string, ProyectoLiteDoc>([
      ["proj-X", proyecto("proj-X")],
      ["proj-Y", proyecto("proj-Y")],
    ]);
    const participaciones = [
      part("proj-X", "i1"),
      part("proj-Y", "i2"),
    ];
    const personasMap = new Map<string, PersonaLiteDoc>([
      ["p1", persona("p1", "Zoe")],
      ["p2", persona("p2", "Ana")],
      ["p3", persona("p3", "Maria")],
    ]);

    const stats = calcularEstadisticas(
      investigadores,
      proyectosMap,
      participaciones,
      personasMap,
    );

    // i1 (Zoe)=1, i2 (Ana)=1, i3 (Maria)=0; orden: Ana, Zoe, Maria
    expect(stats).toEqual([
      { nombre: "Ana", cantidad: 1 },
      { nombre: "Zoe", cantidad: 1 },
      { nombre: "Maria", cantidad: 0 },
    ]);
  });
});

// ============================================================
// calcularKpis
// ============================================================

describe("calcularKpis", () => {
  it("calcula correctamente con_1 / multiples", () => {
    const stats = [
      { nombre: "A", cantidad: 0 },
      { nombre: "B", cantidad: 1 },
      { nombre: "C", cantidad: 1 },
      { nombre: "D", cantidad: 2 },
      { nombre: "E", cantidad: 3 },
      { nombre: "F", cantidad: 0 },
    ];
    const kpis = calcularKpis(10, 6, stats);
    expect(kpis).toEqual({
      total_proyectos: 10,
      total_investigadores: 6,
      investigadores_con_1_proyecto: 2,
      investigadores_multiples_proyectos: 2,
    });
  });

  it("caso vacio: 0 en todos los conteos derivados", () => {
    const kpis = calcularKpis(0, 0, []);
    expect(kpis).toEqual({
      total_proyectos: 0,
      total_investigadores: 0,
      investigadores_con_1_proyecto: 0,
      investigadores_multiples_proyectos: 0,
    });
  });

  it("todos los investigadores tienen multiples proyectos (sin con_1)", () => {
    const stats = [
      { nombre: "A", cantidad: 2 },
      { nombre: "B", cantidad: 5 },
    ];
    const kpis = calcularKpis(7, 2, stats);
    expect(kpis.investigadores_con_1_proyecto).toBe(0);
    expect(kpis.investigadores_multiples_proyectos).toBe(2);
  });
});

// ============================================================
// calcularTrend
// ============================================================

describe("calcularTrend", () => {
  it("agrupa por (anio, mes) desde updated_at y ordena ascendente", () => {
    const proyectos = [
      proyecto("p1", Date.UTC(2026, 0, 15)), // 2026-01
      proyecto("p2", Date.UTC(2026, 0, 20)), // 2026-01
      proyecto("p3", Date.UTC(2026, 1, 10)), // 2026-02
      proyecto("p4", Date.UTC(2025, 11, 5)), // 2025-12
    ];
    const trend = calcularTrend(proyectos);
    expect(trend).toEqual([
      { anio: 2025, mes: 12, cantidad: 1 },
      { anio: 2026, mes: 1, cantidad: 2 },
      { anio: 2026, mes: 2, cantidad: 1 },
    ]);
  });

  it("descarta proyectos con updated_at null/0", () => {
    const proyectos = [
      proyecto("p1", null),
      proyecto("p2", 0),
      proyecto("p3", Date.UTC(2026, 5, 1)), // 2026-06
    ];
    const trend = calcularTrend(proyectos);
    expect(trend).toEqual([{ anio: 2026, mes: 6, cantidad: 1 }]);
  });

  it("descarta proyectos con updated_at inválido (NaN)", () => {
    const proyectos = [
      proyecto("p1", Number.NaN),
      proyecto("p2", Date.UTC(2026, 2, 1)),
    ];
    const trend = calcularTrend(proyectos);
    expect(trend).toEqual([{ anio: 2026, mes: 3, cantidad: 1 }]);
  });

  it("array vacío → array vacío", () => {
    expect(calcularTrend([])).toEqual([]);
  });
});

// ============================================================
// calcularRenacytDistribucion
// ============================================================

describe("calcularRenacytDistribucion", () => {
  it("agrupa por nivel, cuenta con/sin proyectos ACTIVOS, ordena asc case-insensitive", () => {
    const investigadores = [
      inv("i1", "p1", "Carlos"),
      inv("i2", "p2", "Maria"),
      inv("i3", "p3", "Ana"), // misma letra inicial minúscula
      inv("i4", "p4", null), // sin nivel → "No registrado"
      inv("i5", "p5", "  "), // whitespace → "No registrado"
    ];
    const proyectosMap = new Map<string, ProyectoLiteDoc>([
      ["proj-1", proyecto("proj-1")],
      ["proj-2", proyecto("proj-2")],
    ]);
    const participaciones = [
      part("proj-1", "i1"), // i1 (Carlos) → con proyecto
      part("proj-2", "i2"), // i2 (Maria) → con proyecto
      // i3 (Ana) → sin proyecto
      // i4, i5 → sin proyecto
      part("proj-INACTIVE", "i1"), // proyecto inactivo: NO cuenta
    ];

    const distrib = calcularRenacytDistribucion(
      investigadores,
      proyectosMap,
      participaciones,
    );

    // Esperado orden asc case-insensitive: "Ana", "Carlos", "Maria", "No registrado"
    expect(distrib).toEqual([
      { nivel: "Ana", cantidad_investigadores: 1, con_proyectos: 0, sin_proyectos: 1 },
      { nivel: "Carlos", cantidad_investigadores: 1, con_proyectos: 1, sin_proyectos: 0 },
      { nivel: "Maria", cantidad_investigadores: 1, con_proyectos: 1, sin_proyectos: 0 },
      { nivel: "No registrado", cantidad_investigadores: 2, con_proyectos: 0, sin_proyectos: 2 },
    ]);
  });

  it("investigadores con participación en proyectos inactivos NO se cuentan como con_proyectos", () => {
    const investigadores = [inv("i1", "p1", "Carlos")];
    const proyectosMap = new Map<string, ProyectoLiteDoc>(); // sin proyectos activos
    const participaciones = [part("proj-INACTIVE", "i1")];

    const distrib = calcularRenacytDistribucion(
      investigadores,
      proyectosMap,
      participaciones,
    );

    expect(distrib).toEqual([
      { nivel: "Carlos", cantidad_investigadores: 1, con_proyectos: 0, sin_proyectos: 1 },
    ]);
  });

  it("array de investigadores vacío → array vacío", () => {
    const distrib = calcularRenacytDistribucion(
      [],
      new Map<string, ProyectoLiteDoc>(),
      [],
    );
    expect(distrib).toEqual([]);
  });

  it("dos investigadores con mismo nivel (case-insensitive) se acumulan en el mismo grupo", () => {
    const investigadores = [
      inv("i1", "p1", "Carlos"),
      inv("i2", "p2", "carlos"), // case-insensitive mismo grupo
      inv("i3", "p3", "Ana"),
    ];
    const proyectosMap = new Map<string, ProyectoLiteDoc>([
      ["proj-1", proyecto("proj-1")],
    ]);
    const participaciones = [part("proj-1", "i1")]; // solo i1 tiene proyecto

    const distrib = calcularRenacytDistribucion(
      investigadores,
      proyectosMap,
      participaciones,
    );

    // Esperado: "Ana" primero, "Carlos" segundo (se preserva la primera forma vista: "Carlos")
    expect(distrib).toEqual([
      { nivel: "Ana", cantidad_investigadores: 1, con_proyectos: 0, sin_proyectos: 1 },
      { nivel: "Carlos", cantidad_investigadores: 2, con_proyectos: 1, sin_proyectos: 1 },
    ]);
  });
});
