import { describe, it, expect } from "vitest";
import { getApiErrorMessage, getErrorMessage, AppError } from "./error";

describe("getApiErrorMessage", () => {
  it("extracts variant message from body", () => {
    expect(getApiErrorMessage(404, { NotFound: "Investigador no encontrado." })).toBe(
      "Investigador no encontrado.",
    );
    expect(getApiErrorMessage(409, { UniqueConstraintViolation: "DNI duplicado." })).toBe(
      "DNI duplicado.",
    );
    expect(getApiErrorMessage(400, { ValidationError: "Campo requerido" })).toBe("Campo requerido");
    expect(getApiErrorMessage(500, { DatabaseError: "Connection refused" })).toBe(
      "Connection refused",
    );
    expect(getApiErrorMessage(503, { ConfigurationError: "RENIEC no configurado" })).toBe(
      "RENIEC no configurado",
    );
    expect(getApiErrorMessage(502, { ExternalServiceError: "Timeout" })).toBe("Timeout");
    expect(getApiErrorMessage(409, { ReferentialIntegrity: "Grado en uso" })).toBe("Grado en uso");
    expect(getApiErrorMessage(500, { InternalError: "Error interno" })).toBe("Error interno");
    expect(getApiErrorMessage(409, { DataInconsistency: "Dato inconsistente" })).toBe(
      "Dato inconsistente",
    );
  });

  it("falls back to status message when no variant", () => {
    expect(getApiErrorMessage(401, null)).toBe("Sesion expirada o credenciales invalidas");
    expect(getApiErrorMessage(403, {})).toBe("No tiene permisos para esta accion");
    expect(getApiErrorMessage(404, undefined)).toBe("Recurso no encontrado");
    expect(getApiErrorMessage(409, { code: 500 })).toBe("Conflicto con datos existentes");
    expect(getApiErrorMessage(500, {})).toBe("Error interno del servidor");
    expect(getApiErrorMessage(502, {})).toBe("Servicio externo no disponible");
    expect(getApiErrorMessage(503, {})).toBe("Servicio no configurado");
  });

  it("falls back to string body", () => {
    expect(getApiErrorMessage(400, "Bad request")).toBe("Bad request");
  });

  it("falls back to generic HTTP message for unknown status", () => {
    expect(getApiErrorMessage(418, {})).toBe("Error HTTP 418");
  });

  it("ignores empty variant strings", () => {
    expect(getApiErrorMessage(400, { ValidationError: "  " })).toBe(
      "Solicitud incorrecta",
    );
  });
});

describe("getErrorMessage", () => {
  it("returns default for falsy values", () => {
    expect(getErrorMessage(null)).toBe("Error desconocido");
    expect(getErrorMessage(undefined)).toBe("Error desconocido");
    expect(getErrorMessage(false)).toBe("Error desconocido");
    expect(getErrorMessage(0)).toBe("Error desconocido");
  });

  it("returns string as-is", () => {
    expect(getErrorMessage("connection failed")).toBe("connection failed");
  });

  it("extracts .message from Error objects", () => {
    expect(getErrorMessage(new Error("something broke"))).toBe("something broke");
  });

  it("extracts .message from AppError", () => {
    expect(getErrorMessage(new AppError("API error"))).toBe("API error");
  });

  it("extracts variant message from object body", () => {
    expect(getErrorMessage({ NotFound: "No existe" })).toBe("No existe");
    expect(getErrorMessage({ ValidationError: "campo requerido" })).toBe("campo requerido");
  });

  it("prefers .message over variant when both present", () => {
    expect(getErrorMessage({ message: "direct msg", NotFound: "variant msg" })).toBe("direct msg");
  });

  it("falls back to JSON.stringify for objects without message/variant", () => {
    expect(getErrorMessage({ code: 42, detail: "unknown" })).toBe('{"code":42,"detail":"unknown"}');
  });

  it("handles objects with circular references gracefully", () => {
    const circular: Record<string, unknown> = {};
    circular.self = circular;
    const result = getErrorMessage(circular);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});
