import { describe, it, expect } from "vitest";
import { hasPermission, normalizeAppRole, getRoleLabel } from "./permissions";

describe("normalizeAppRole", () => {
  it("returns admin for admin string", () => {
    expect(normalizeAppRole("admin")).toBe("admin");
  });

  it("returns operador for operador string", () => {
    expect(normalizeAppRole("operador")).toBe("operador");
  });

  it("returns consulta for consulta string", () => {
    expect(normalizeAppRole("consulta")).toBe("consulta");
  });

  it("returns consulta for unknown roles", () => {
    expect(normalizeAppRole("superadmin")).toBe("consulta");
  });

  it("handles null and undefined", () => {
    expect(normalizeAppRole(null)).toBe("consulta");
    expect(normalizeAppRole(undefined)).toBe("consulta");
  });

  it("trims whitespace and lowercases", () => {
    expect(normalizeAppRole(" Admin ")).toBe("admin");
  });
});

describe("hasPermission", () => {
  it("admin has all permissions", () => {
    expect(hasPermission("admin", "dashboard.view")).toBe(true);
    expect(hasPermission("admin", "usuarios.manage")).toBe(true);
    expect(hasPermission("admin", "configuracion.view")).toBe(true);
  });

  it("operador has operational permissions but not config", () => {
    expect(hasPermission("operador", "docentes.manage")).toBe(true);
    expect(hasPermission("operador", "reportes.export")).toBe(true);
    expect(hasPermission("operador", "usuarios.manage")).toBe(false);
    expect(hasPermission("operador", "configuracion.view")).toBe(false);
  });

  it("consulta has only view permissions", () => {
    expect(hasPermission("consulta", "dashboard.view")).toBe(true);
    expect(hasPermission("consulta", "docentes.view")).toBe(true);
    expect(hasPermission("consulta", "docentes.manage")).toBe(false);
    expect(hasPermission("consulta", "reportes.export")).toBe(false);
  });
});

describe("getRoleLabel", () => {
  it("returns readable labels", () => {
    expect(getRoleLabel("superuser")).toBe("Superusuario");
    expect(getRoleLabel("admin")).toBe("Administrador");
    expect(getRoleLabel("operador")).toBe("Operador");
    expect(getRoleLabel("consulta")).toBe("Consulta");
    expect(getRoleLabel("responsable_proyecto")).toBe("Resp. Proyecto");
  });
});

describe("new roles: superuser and responsable_proyecto", () => {
  it("superuser has all permissions", () => {
    expect(hasPermission("superuser", "dashboard.view")).toBe(true);
    expect(hasPermission("superuser", "docentes.manage")).toBe(true);
    expect(hasPermission("superuser", "usuarios.manage")).toBe(true);
    expect(hasPermission("superuser", "configuracion.view")).toBe(true);
  });

  it("responsable_proyecto cannot manage usuarios", () => {
    expect(hasPermission("responsable_proyecto", "usuarios.manage")).toBe(false);
    expect(hasPermission("responsable_proyecto", "configuracion.view")).toBe(false);
  });

  it("responsable_proyecto can view and manage proyectos", () => {
    expect(hasPermission("responsable_proyecto", "proyectos.view")).toBe(true);
    expect(hasPermission("responsable_proyecto", "proyectos.manage")).toBe(true);
    expect(hasPermission("responsable_proyecto", "reportes.export")).toBe(true);
  });
});
