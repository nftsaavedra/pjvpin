import { describe, it, expect } from "vitest";
import { getApiErrorMessage, getErrorMessage, AppError } from "./error";

describe("getApiErrorMessage", () => {
  it("reads body.message (standard NestJS shape)", () => {
    expect(
      getApiErrorMessage(404, { statusCode: 404, message: "Investigador no encontrado.", error: "NotFound" }),
    ).toBe("Investigador no encontrado.");
    expect(
      getApiErrorMessage(401, { statusCode: 401, message: "Credenciales invalidas.", error: "Unauthorized" }),
    ).toBe("Credenciales invalidas.");
    expect(
      getApiErrorMessage(403, { statusCode: 403, message: "No tiene permisos.", error: "Forbidden" }),
    ).toBe("No tiene permisos.");
  });

  it("joins body.message when it is an array (validation errors)", () => {
    expect(
      getApiErrorMessage(400, { statusCode: 400, message: ["campo a es requerido", "campo b invalido"] }),
    ).toBe("campo a es requerido; campo b invalido");
  });

  it("falls back to status message when body has no message", () => {
    expect(getApiErrorMessage(401, null)).toBe("Sesion expirada o credenciales invalidas");
    expect(getApiErrorMessage(403, {})).toBe("No tiene permisos para esta accion");
    expect(getApiErrorMessage(404, undefined)).toBe("Recurso no encontrado");
    expect(getApiErrorMessage(409, { code: 500 })).toBe("Conflicto con datos existentes");
    expect(getApiErrorMessage(500, {})).toBe("Error interno del servidor");
    expect(getApiErrorMessage(502, {})).toBe("Servicio externo no disponible");
    expect(getApiErrorMessage(503, {})).toBe("Servicio no configurado");
    expect(getApiErrorMessage(429, {})).toBe("Demasiadas solicitudes. Intente mas tarde.");
  });

  it("falls back to string body", () => {
    expect(getApiErrorMessage(400, "Bad request")).toBe("Bad request");
  });

  it("falls back to generic HTTP message for unknown status", () => {
    expect(getApiErrorMessage(418, {})).toBe("Error HTTP 418");
  });

  it("ignores empty message strings", () => {
    expect(getApiErrorMessage(400, { message: "  " })).toBe("Solicitud incorrecta");
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

  it("falls back to JSON.stringify for objects without message", () => {
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
