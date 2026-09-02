/**
 * Tests de funciones puras del dominio `publicaciones`. Cubre D3 (tipos),
 * D7 (validacion estricta de entrada via class-validator + lógica) y
 * el port del VO `Doi` desde `shared/doi.rs`.
 */
import { AppError } from "../infra/errors/app-error";
import {
  validarAccesoAbierto,
  validarCuartil,
  validarDoi,
  validarDominioOrigen,
  validarIdioma,
  validarOrdenAutor,
  validarTipoPublicacion,
  validarTitulo,
  trimOrNull,
} from "./publicaciones.logic";

describe("validarDoi (port VO Rust shared/doi.rs)", () => {
  it("null/undefined/empty → null", () => {
    expect(validarDoi(null)).toBeNull();
    expect(validarDoi(undefined)).toBeNull();
    expect(validarDoi("")).toBeNull();
    expect(validarDoi("   ")).toBeNull();
  });

  it("DOI valido se normaliza (trim)", () => {
    expect(validarDoi(" 10.1234/abc.2024 ")).toBe("10.1234/abc.2024");
  });

  it.each([
    "10.1234/ab",
    "10.1000/journal.pbio.1000001",
    "10.5555/abc-def_ghi.jkl",
  ])("acepta DOI canónico '%s'", (v) => {
    expect(validarDoi(v)).toBe(v);
  });

  it.each([
    ["10.1234", "separador '/' ausente"],
    ["1234/abc", "prefijo '10.' ausente"],
    ["10./abc", "sin digitos tras '10.'"],
    ["10.12 34/abc", "espacios en sufijo"],
    ["10./", "sufijo vacio"],
  ])("rechaza DOI invalido '%s' (%s)", (v) => {
    expect(() => validarDoi(v)).toThrow(AppError);
  });

  it("rechaza DOI > 255 chars", () => {
    const v = "10." + "x".repeat(254);
    expect(() => validarDoi(v)).toThrow(/longitud maxima/);
  });

  it("rechaza prefijo DOI con letras tras '10.'", () => {
    expect(() => validarDoi("10.abc/foo")).toThrow(/digitos/);
  });
});

describe("validarIdioma (ISO 639-1)", () => {
  it.each(["es", "en", "pt", "qu"])("acepta '%s'", (v) => {
    expect(validarIdioma(v)).toBe(v);
  });

  it.each(["ES", "esp", "e", "english", "12"])(
    "rechaza '%s' (no es ISO 639-1 valido)",
    (v) => {
      expect(() => validarIdioma(v)).toThrow(/ISO 639-1/);
    },
  );

  it("null/undefined/empty → null", () => {
    expect(validarIdioma(null)).toBeNull();
    expect(validarIdioma(undefined)).toBeNull();
    expect(validarIdioma("")).toBeNull();
  });
});

describe("validarCuartil (Q1..Q4)", () => {
  it.each(["Q1", "Q2", "Q3", "Q4"])("acepta '%s'", (v) => {
    expect(validarCuartil(v)).toBe(v);
  });

  it.each(["Q5", "q1", "0", "A1"])("rechaza '%s'", (v) => {
    expect(() => validarCuartil(v)).toThrow(/cuartil/);
  });

  it("null/undefined/empty → null", () => {
    expect(validarCuartil(null)).toBeNull();
    expect(validarCuartil(undefined)).toBeNull();
    expect(validarCuartil("")).toBeNull();
  });
});

describe("validarAccesoAbierto (3 valores)", () => {
  it.each(["acceso_abierto", "solo_metadatos", "embargado"])("acepta '%s'", (v) => {
    expect(validarAccesoAbierto(v)).toBe(v);
  });

  it.each(["abierto", "OPEN", "no_acceso"])("rechaza '%s'", (v) => {
    expect(() => validarAccesoAbierto(v)).toThrow(/acceso_abierto/);
  });

  it("null/undefined/empty → null", () => {
    expect(validarAccesoAbierto(null)).toBeNull();
  });
});

describe("validarDominioOrigen (3 valores)", () => {
  it.each(["MANUAL", "PURE", "PERUCRIS"])("acepta '%s'", (v) => {
    expect(validarDominioOrigen(v)).toBe(v);
  });

  it.each(["manual", "OPENALEX", "scopus"])("rechaza '%s'", (v) => {
    expect(() => validarDominioOrigen(v)).toThrow(/dominio_origen/);
  });

  it("ausente o empty → default 'MANUAL'", () => {
    expect(validarDominioOrigen(null)).toBe("MANUAL");
    expect(validarDominioOrigen(undefined)).toBe("MANUAL");
    expect(validarDominioOrigen("")).toBe("MANUAL");
    expect(validarDominioOrigen("   ")).toBe("MANUAL");
  });
});

describe("validarTipoPublicacion (vocabulario canónico + legacy EN, D3)", () => {
  it.each([
    "articulo",
    "articulo_revista",
    "articulo_conferencia",
    "carta",
    "resena",
    "comunicacion_congreso",
    "libro",
    "capitulo_libro",
    "software",
    "tesis",
    // Legacy EN (lectura tolerante)
    "journal article",
    "conference paper",
    "letter",
    "review",
  ])("acepta '%s'", (v) => {
    expect(validarTipoPublicacion(v)).toBe(v);
  });

  it.each([
    "dataset",
    "working_paper",
    "conferencia",
    "capitulo",
    "dataset",
    "otros",
    "dataset/123",
  ])("rechaza tipo fuera del vocabulario '%s'", (v) => {
    expect(() => validarTipoPublicacion(v)).toThrow(/tipo de publicacion/);
  });

  it.each([null, undefined, "", "   "])(
    "rechaza ausente/vacio '%s' (obligatorio)",
    (v) => {
      expect(() => validarTipoPublicacion(v)).toThrow(/obligatorio/);
    },
  );
});

describe("validarTitulo", () => {
  it("trim + obligatorio", () => {
    expect(validarTitulo("  Hola mundo  ")).toBe("Hola mundo");
  });

  it.each([null, undefined, "", "   "])(
    "rechaza '%s'",
    (v) => {
      expect(() => validarTitulo(v)).toThrow(/obligatorio/);
    },
  );
});

describe("validarOrdenAutor (>= 1)", () => {
  it.each([1, 2, 5, 100])("acepta '%s'", (v) => {
    expect(validarOrdenAutor(v)).toBe(v);
  });

  it.each([0, -1, -100])("rechaza '%s' (< 1)", (v) => {
    expect(() => validarOrdenAutor(v)).toThrow(/>= 1/);
  });

  it.each([1.5, NaN, Infinity, null, undefined])(
    "rechaza '%s' (no entero)",
    (v) => {
      expect(() => validarOrdenAutor(v as number)).toThrow();
    },
  );
});

describe("trimOrNull", () => {
  it.each([
    [null, null],
    [undefined, null],
    ["", null],
    ["   ", null],
    ["valor", "valor"],
    ["  valor  ", "valor"],
  ])("'%s' → '%s'", (input, expected) => {
    expect(trimOrNull(input as string | null | undefined)).toBe(expected);
  });
});