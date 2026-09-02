/**
 * Tests de funciones puras del modulo `sync`. Cubre:
 *   - `parseTipo`: validos (`pure_diff`, `perucris_validacion`), invalidos
 *     (lanza `AppError.validation`), vacios (devuelve `null`), normalizacion
 *     (trim, case-sensitivity replica Rust).
 *   - `clampLimit`: defaults, clamp a [1, 100], tipos numericos y string.
 */
import { AppError } from "../infra/errors/app-error";
import {
  SYNC_REPORT_DEFAULT_LIMIT,
  SYNC_REPORT_MAX_LIMIT,
  SYNC_REPORT_MIN_LIMIT,
  clampLimit,
  parseTipo,
} from "./sync.logic";

describe("parseTipo (SyncReportTipo::parse)", () => {
  it.each([
    "pure_diff",
    "perucris_validacion",
    "pure_diff ",
    "  pure_diff",
    " pure_diff ",
  ])("acepta tipo valido: '%s'", (raw) => {
    const result = parseTipo(raw);
    expect(result).not.toBeNull();
  });

  it("devuelve 'pure_diff' para el discriminante correspondiente", () => {
    expect(parseTipo("pure_diff")).toBe("pure_diff");
  });

  it("devuelve 'perucris_validacion' para el discriminante correspondiente", () => {
    expect(parseTipo("perucris_validacion")).toBe("perucris_validacion");
  });

  it.each([null, undefined, "", "   "])(
    "devuelve null para tipo vacio/ausente: %s",
    (raw) => {
      expect(parseTipo(raw)).toBeNull();
    },
  );

  it("lanza AppError.validation para discriminante desconocido", () => {
    expect(() => parseTipo("otro")).toThrow(AppError);
    expect(() => parseTipo("otro")).toThrow(
      /Tipo de reporte de sincronizacion desconocido: 'otro'/,
    );
  });

  it("lanza AppError.validation con variante ValidationError", () => {
    try {
      parseTipo("foo");
      fail("debio lanzar");
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      const appErr = err as AppError;
      expect(appErr.variant).toBe("ValidationError");
    }
  });

  it("NO acepta variantes en mayusculas (replica contrato Rust snake_case)", () => {
    expect(() => parseTipo("PURE_DIFF")).toThrow(AppError);
    expect(() => parseTipo("PureDiff")).toThrow(AppError);
  });
});

describe("clampLimit", () => {
  it("devuelve el default cuando el parametro es null/undefined", () => {
    expect(clampLimit(null)).toBe(SYNC_REPORT_DEFAULT_LIMIT);
    expect(clampLimit(undefined)).toBe(SYNC_REPORT_DEFAULT_LIMIT);
  });

  it("devuelve el default cuando el parametro es string no numerico", () => {
    expect(clampLimit("abc")).toBe(SYNC_REPORT_DEFAULT_LIMIT);
    expect(clampLimit("")).toBe(SYNC_REPORT_DEFAULT_LIMIT);
  });

  it("clampa a MIN_LIMIT cuando el valor es 0 o negativo", () => {
    expect(clampLimit(0)).toBe(SYNC_REPORT_MIN_LIMIT);
    expect(clampLimit(-5)).toBe(SYNC_REPORT_MIN_LIMIT);
    expect(clampLimit("0")).toBe(SYNC_REPORT_MIN_LIMIT);
  });

  it("clampa a MAX_LIMIT cuando el valor supera el tope", () => {
    expect(clampLimit(200)).toBe(SYNC_REPORT_MAX_LIMIT);
    expect(clampLimit(10_000)).toBe(SYNC_REPORT_MAX_LIMIT);
    expect(clampLimit("9999")).toBe(SYNC_REPORT_MAX_LIMIT);
  });

  it("acepta valores dentro del rango y los redondea a entero", () => {
    expect(clampLimit(1)).toBe(1);
    expect(clampLimit(50)).toBe(50);
    expect(clampLimit(100)).toBe(100);
    expect(clampLimit("75")).toBe(75);
  });

  it("trunca decimales al entero inferior", () => {
    expect(clampLimit(50.9)).toBe(50);
    expect(clampLimit("50.9")).toBe(50);
  });

  it("rechaza Infinity y NaN (devuelve el default)", () => {
    expect(clampLimit(Number.POSITIVE_INFINITY)).toBe(SYNC_REPORT_DEFAULT_LIMIT);
    expect(clampLimit(Number.NaN)).toBe(SYNC_REPORT_DEFAULT_LIMIT);
    expect(clampLimit("Infinity")).toBe(SYNC_REPORT_DEFAULT_LIMIT);
    expect(clampLimit("NaN")).toBe(SYNC_REPORT_DEFAULT_LIMIT);
  });
});

describe("constantes del modulo sync", () => {
  it("DEFAULT_LIMIT=10, MIN=1, MAX=100", () => {
    expect(SYNC_REPORT_DEFAULT_LIMIT).toBe(10);
    expect(SYNC_REPORT_MIN_LIMIT).toBe(1);
    expect(SYNC_REPORT_MAX_LIMIT).toBe(100);
  });
});
