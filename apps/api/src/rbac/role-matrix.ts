import { AppPermission } from "./permissions.enum";

export type AppRole = "superuser" | "admin" | "operador" | "consulta" | "responsable_proyecto";

/**
 * Matriz role-has-permission EXACTA del censo 03 §10 (1:1 con shared/rbac.rs).
 */
const SUPERUSER: ReadonlyArray<AppPermission> = Object.values(AppPermission);

const ADMIN: ReadonlyArray<AppPermission> = SUPERUSER;

const OPERADOR: ReadonlyArray<AppPermission> = [
  AppPermission.DashboardView,
  AppPermission.InvestigadoresView,
  AppPermission.InvestigadoresManage,
  AppPermission.ProyectosView,
  AppPermission.ProyectosManage,
  AppPermission.PublicacionesView,
  AppPermission.PublicacionesManage,
  AppPermission.ReportesView,
  AppPermission.ReportesExport,
  AppPermission.GradosRead,
  AppPermission.GruposView,
  AppPermission.GruposManage,
  AppPermission.RecursosManage,
  AppPermission.CatalogosRead,
  AppPermission.GeoRead,
  AppPermission.OrgUnitsView,
  AppPermission.OrgUnitsManage,
  AppPermission.VocabulariosRead,
  AppPermission.OcdeAssignManage,
];

const CONSULTA_RESPONSABLE: ReadonlyArray<AppPermission> = [
  AppPermission.DashboardView,
  AppPermission.InvestigadoresView,
  AppPermission.ProyectosView,
  AppPermission.PublicacionesView,
  AppPermission.ReportesView,
  AppPermission.GruposView,
  AppPermission.GeoRead,
  AppPermission.OrgUnitsView,
  AppPermission.VocabulariosRead,
];

export const ROLE_PERMISSIONS: Readonly<Record<AppRole, ReadonlyArray<AppPermission>>> = {
  superuser: SUPERUSER,
  admin: ADMIN,
  operador: OPERADOR,
  consulta: CONSULTA_RESPONSABLE,
  responsable_proyecto: CONSULTA_RESPONSABLE,
};

export const ALL_ROLES: ReadonlyArray<AppRole> = [
  "superuser",
  "admin",
  "operador",
  "consulta",
  "responsable_proyecto",
];

function normalizeRole(role: string | null | undefined): AppRole | null {
  if (typeof role !== "string") return null;
  const r = role.trim().toLowerCase();
  return (ALL_ROLES as ReadonlyArray<string>).includes(r) ? (r as AppRole) : null;
}

export function roleHasPermission(role: string | null | undefined, perm: AppPermission): boolean {
  const r = normalizeRole(role);
  if (r === null) return false;
  return ROLE_PERMISSIONS[r].includes(perm);
}
