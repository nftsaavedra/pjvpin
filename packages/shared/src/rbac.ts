/**
 * Permisos del sistema. Fuente unica de verdad consumida por apps/api
 * (NestJS guard + matrix) y apps/desktop (React permissions.ts). El backend
 * es la fuente autoritativa para enforcement; el frontend refleja el
 * mismo set para reflejar el menu/UI.
 *
 * Antes existian dos copias divergentes (`apps/api/src/rbac/permissions.enum.ts`
 * + `apps/desktop/src/shared/auth/permissions.ts`) que producian
 * comportamientos diferentes para el mismo rol (desync documentado en
 * docs/backend/README.md §hallazgo 1).
 */

export const AppPermission = {
  DashboardView: "DashboardView",
  InvestigadoresView: "InvestigadoresView",
  InvestigadoresManage: "InvestigadoresManage",
  ProyectosView: "ProyectosView",
  ProyectosManage: "ProyectosManage",
  PublicacionesView: "PublicacionesView",
  PublicacionesManage: "PublicacionesManage",
  ReportesView: "ReportesView",
  ReportesExport: "ReportesExport",
  GradosRead: "GradosRead",
  GradosManage: "GradosManage",
  GruposView: "GruposView",
  GruposManage: "GruposManage",
  RecursosManage: "RecursosManage",
  CatalogosRead: "CatalogosRead",
  CatalogosManage: "CatalogosManage",
  UsuariosManage: "UsuariosManage",
  GeoRead: "GeoRead",
  OrgUnitsView: "OrgUnitsView",
  OrgUnitsManage: "OrgUnitsManage",
  VocabulariosRead: "VocabulariosRead",
  VocabulariosManage: "VocabulariosManage",
  OcdeAssignManage: "OcdeAssignManage",
} as const;

export type AppPermission = (typeof AppPermission)[keyof typeof AppPermission];

export const APP_PERMISSIONS = Object.values(AppPermission) as ReadonlyArray<AppPermission>;

export const APP_ROLES = [
  "superuser",
  "admin",
  "operador",
  "consulta",
  "responsable_proyecto",
] as const;

export type AppRole = (typeof APP_ROLES)[number];

const PERMISSIONS_BY_ROLE: Readonly<Record<AppRole, ReadonlyArray<AppPermission>>> = {
  superuser: APP_PERMISSIONS,
  admin: APP_PERMISSIONS,
  operador: [
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
  ],
  consulta: [
    AppPermission.DashboardView,
    AppPermission.InvestigadoresView,
    AppPermission.ProyectosView,
    AppPermission.PublicacionesView,
    AppPermission.ReportesView,
    AppPermission.GruposView,
    AppPermission.GeoRead,
    AppPermission.OrgUnitsView,
    AppPermission.VocabulariosRead,
  ],
  responsable_proyecto: [
    AppPermission.DashboardView,
    AppPermission.InvestigadoresView,
    AppPermission.ProyectosView,
    AppPermission.PublicacionesView,
    AppPermission.ReportesView,
    AppPermission.GruposView,
    AppPermission.GeoRead,
    AppPermission.OrgUnitsView,
    AppPermission.VocabulariosRead,
  ],
};

export function normalizeRole(role: string | null | undefined): AppRole | null {
  if (typeof role !== "string") return null;
  const r = role.trim().toLowerCase();
  return (APP_ROLES as ReadonlyArray<string>).includes(r) ? (r as AppRole) : null;
}

export function roleHasPermission(
  role: string | null | undefined,
  permission: AppPermission,
): boolean {
  const r = normalizeRole(role);
  if (r === null) return false;
  return PERMISSIONS_BY_ROLE[r].includes(permission);
}

export function permissionsForRole(role: AppRole): ReadonlyArray<AppPermission> {
  return PERMISSIONS_BY_ROLE[role];
}
