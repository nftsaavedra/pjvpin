import { describe, it, expect } from "vitest";
import { hasPermission, normalizeAppRole, getRoleLabel, AppPermission } from "./permissions";

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

describe("hasPermission (canonical matrix, fuente unica shared)", () => {
  it("superuser and admin have all permissions", () => {
    for (const role of ["superuser", "admin"]) {
      expect(hasPermission(role, AppPermission.DashboardView)).toBe(true);
      expect(hasPermission(role, AppPermission.UsuariosManage)).toBe(true);
      expect(hasPermission(role, AppPermission.InvestigadoresManage)).toBe(true);
      expect(hasPermission(role, AppPermission.ReportesExport)).toBe(true);
    }
  });

  it("operador has operational permissions but not usuarios.manage", () => {
    expect(hasPermission("operador", AppPermission.InvestigadoresManage)).toBe(true);
    expect(hasPermission("operador", AppPermission.ReportesExport)).toBe(true);
    expect(hasPermission("operador", AppPermission.PublicacionesManage)).toBe(true);
    expect(hasPermission("operador", AppPermission.UsuariosManage)).toBe(false);
  });

  it("consulta has only view permissions", () => {
    expect(hasPermission("consulta", AppPermission.DashboardView)).toBe(true);
    expect(hasPermission("consulta", AppPermission.InvestigadoresView)).toBe(true);
    expect(hasPermission("consulta", AppPermission.InvestigadoresManage)).toBe(false);
    expect(hasPermission("consulta", AppPermission.ReportesExport)).toBe(false);
    expect(hasPermission("consulta", AppPermission.PublicacionesManage)).toBe(false);
  });

  it("responsable_proyecto: read-only (sin proyectos.manage, sin reportes.export)", () => {
    expect(hasPermission("responsable_proyecto", AppPermission.ProyectosView)).toBe(true);
    expect(hasPermission("responsable_proyecto", AppPermission.ProyectosManage)).toBe(false);
    expect(hasPermission("responsable_proyecto", AppPermission.ReportesExport)).toBe(false);
    expect(hasPermission("responsable_proyecto", AppPermission.UsuariosManage)).toBe(false);
    expect(hasPermission("responsable_proyecto", AppPermission.InvestigadoresView)).toBe(true);
  });

  it("desync resuelto: frontend y backend comparten la misma matriz canonica", () => {
    // Antes: frontend daba proyectos.manage y reportes.export a responsable_proyecto;
    // backend los denegaba (el guard rechazaba con 500 -> ahora 403 tras W1).
    // Ahora: ambos consumen @pjvpin/shared, mismo resultado.
    expect(hasPermission("responsable_proyecto", AppPermission.ProyectosManage)).toBe(
      hasPermission("consulta", AppPermission.ProyectosManage),
    );
    expect(hasPermission("responsable_proyecto", AppPermission.ReportesExport)).toBe(
      hasPermission("consulta", AppPermission.ReportesExport),
    );
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
