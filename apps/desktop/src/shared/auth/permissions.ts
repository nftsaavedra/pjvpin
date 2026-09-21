/**
 * Permisos y matriz de roles consumidos por la UI (menu, botones, etc).
 * Re-export de `@pjvpin/shared` (fuente unica de verdad) y traduccion
 * a la forma que la UI espera (etiquetas, modulos).
 */
export { AppPermission, APP_PERMISSIONS, type AppRole } from "@pjvpin/shared";
import { AppPermission, type AppRole, permissionsForRole } from "@pjvpin/shared";

interface RoleDefinition {
  label: string;
  summary: string;
  permissions: AppPermission[];
  modules: string[];
}

const ROLE_DEFINITIONS_DATA: Record<AppRole, RoleDefinition> = {
  superuser: {
    label: "Superusuario",
    summary: "Control total del sistema.",
    permissions: [
      AppPermission.DashboardView,
      AppPermission.InvestigadoresView,
      AppPermission.InvestigadoresManage,
      AppPermission.ProyectosView,
      AppPermission.ProyectosManage,
      AppPermission.PublicacionesView,
      AppPermission.PublicacionesManage,
      AppPermission.GruposView,
      AppPermission.GruposManage,
      AppPermission.ReportesView,
      AppPermission.ReportesExport,
      AppPermission.GradosManage,
      AppPermission.CatalogosRead,
      AppPermission.CatalogosManage,
      AppPermission.GeoRead,
      AppPermission.UsuariosManage,
      AppPermission.VocabulariosRead,
      AppPermission.VocabulariosManage,
      AppPermission.OrgUnitsView,
      AppPermission.OrgUnitsManage,
    ],
    modules: [
      "Panel",
      "Investigadores",
      "Proyectos",
      "Publicaciones",
      "Grupos",
      "Recursos",
      "Reportes",
      "Grados",
      "Catálogos",
      "Unidades Org.",
      "Usuarios",
      "Configuración",
    ],
  },
  admin: {
    label: "Administrador",
    summary: "Gestión total del sistema y usuarios.",
    permissions: [
      AppPermission.DashboardView,
      AppPermission.InvestigadoresView,
      AppPermission.InvestigadoresManage,
      AppPermission.ProyectosView,
      AppPermission.ProyectosManage,
      AppPermission.PublicacionesView,
      AppPermission.PublicacionesManage,
      AppPermission.GruposView,
      AppPermission.GruposManage,
      AppPermission.ReportesView,
      AppPermission.ReportesExport,
      AppPermission.GradosManage,
      AppPermission.CatalogosRead,
      AppPermission.CatalogosManage,
      AppPermission.GeoRead,
      AppPermission.UsuariosManage,
      AppPermission.VocabulariosRead,
      AppPermission.VocabulariosManage,
      AppPermission.OrgUnitsView,
      AppPermission.OrgUnitsManage,
    ],
    modules: [
      "Panel",
      "Investigadores",
      "Proyectos",
      "Publicaciones",
      "Grupos",
      "Recursos",
      "Reportes",
      "Grados",
      "Catálogos",
      "Unidades Org.",
      "Usuarios",
    ],
  },
  operador: {
    label: "Operador",
    summary: "Gestión operativa diaria.",
    permissions: [
      AppPermission.DashboardView,
      AppPermission.InvestigadoresView,
      AppPermission.InvestigadoresManage,
      AppPermission.ProyectosView,
      AppPermission.ProyectosManage,
      AppPermission.PublicacionesView,
      AppPermission.PublicacionesManage,
      AppPermission.GruposView,
      AppPermission.GruposManage,
      AppPermission.ReportesView,
      AppPermission.ReportesExport,
      AppPermission.CatalogosRead,
      AppPermission.GeoRead,
      AppPermission.OrgUnitsView,
      AppPermission.OrgUnitsManage,
      AppPermission.VocabulariosRead,
    ],
    modules: [
      "Panel",
      "Investigadores",
      "Proyectos",
      "Publicaciones",
      "Grupos",
      "Recursos",
      "Reportes",
      "Unidades Org.",
    ],
  },
  consulta: {
    label: "Consulta",
    summary: "Solo lectura de la información operativa.",
    permissions: [
      AppPermission.DashboardView,
      AppPermission.InvestigadoresView,
      AppPermission.ProyectosView,
      AppPermission.PublicacionesView,
      AppPermission.GruposView,
      AppPermission.ReportesView,
      AppPermission.GeoRead,
      AppPermission.OrgUnitsView,
      AppPermission.VocabulariosRead,
    ],
    modules: [
      "Panel",
      "Investigadores",
      "Proyectos",
      "Publicaciones",
      "Grupos",
      "Reportes",
      "Unidades Org.",
    ],
  },
  responsable_proyecto: {
    label: "Resp. Proyecto",
    summary: "Acceso a sus proyectos como responsable.",
    permissions: [
      AppPermission.DashboardView,
      AppPermission.InvestigadoresView,
      AppPermission.ProyectosView,
      AppPermission.PublicacionesView,
      AppPermission.GruposView,
      AppPermission.ReportesView,
      AppPermission.GeoRead,
      AppPermission.OrgUnitsView,
      AppPermission.VocabulariosRead,
    ],
    modules: ["Panel", "Investigadores", "Proyectos", "Publicaciones", "Grupos", "Reportes", "Unidades Org."],
  },
};

/** Reconstruye ROLE_DEFINITIONS derivando de la matriz canonica de shared. */
export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = Object.fromEntries(
  (Object.keys(ROLE_DEFINITIONS_DATA) as AppRole[]).map((role) => [
    role,
    {
      ...ROLE_DEFINITIONS_DATA[role],
      permissions: [...permissionsForRole(role)],
    },
  ]),
) as Record<AppRole, RoleDefinition>;

const isAppRole = (value: string): value is AppRole => value in ROLE_DEFINITIONS;

export const normalizeAppRole = (value: string | null | undefined): AppRole => {
  const normalizedValue = (value ?? "").trim().toLowerCase();

  if (isAppRole(normalizedValue)) {
    return normalizedValue;
  }

  return "consulta";
};

export const getRoleLabel = (value: string | null | undefined) =>
  ROLE_DEFINITIONS[normalizeAppRole(value)].label;

export const hasPermission = (role: string | null | undefined, permission: AppPermission) =>
  ROLE_DEFINITIONS[normalizeAppRole(role)].permissions.includes(permission);

export const getRoleOptions = () =>
  Object.entries(ROLE_DEFINITIONS).map(([value, definition]) => ({
    value,
    label: definition.label,
  }));
