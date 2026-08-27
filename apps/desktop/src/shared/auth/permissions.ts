export type AppRole = "superuser" | "admin" | "operador" | "consulta" | "responsable_proyecto";

export type AppPermission =
  | "dashboard.view"
  | "investigadores.view"
  | "investigadores.manage"
  | "proyectos.view"
  | "proyectos.manage"
  | "publicaciones.view"
  | "publicaciones.manage"
  | "grupos.view"
  | "grupos.manage"
  | "reportes.view"
  | "reportes.export"
  | "configuracion.view"
  | "grados.manage"
  | "catalogos.view"
  | "catalogos.manage"
  | "geo.view"
  | "usuarios.manage"
  | "vocabularios.view"
  | "vocabularios.manage"
  | "org_units.view"
  | "org_units.manage";

interface RoleDefinition {
  label: string;
  summary: string;
  permissions: AppPermission[];
  modules: string[];
}

export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  superuser: {
    label: "Superusuario",
    summary: "Control total del sistema.",
    permissions: [
      "dashboard.view",
      "investigadores.view",
      "investigadores.manage",
      "proyectos.view",
      "proyectos.manage",
      "publicaciones.view",
      "publicaciones.manage",
      "grupos.view",
      "grupos.manage",
      "reportes.view",
      "reportes.export",
      "configuracion.view",
      "grados.manage",
      "catalogos.view",
      "catalogos.manage",
      "geo.view",
      "usuarios.manage",
      "vocabularios.view",
      "vocabularios.manage",
      "org_units.view",
      "org_units.manage",
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
      "dashboard.view",
      "investigadores.view",
      "investigadores.manage",
      "proyectos.view",
      "proyectos.manage",
      "publicaciones.view",
      "publicaciones.manage",
      "grupos.view",
      "grupos.manage",
      "reportes.view",
      "reportes.export",
      "configuracion.view",
      "grados.manage",
      "catalogos.view",
      "catalogos.manage",
      "geo.view",
      "usuarios.manage",
      "vocabularios.view",
      "vocabularios.manage",
      "org_units.view",
      "org_units.manage",
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
      "dashboard.view",
      "investigadores.view",
      "investigadores.manage",
      "proyectos.view",
      "proyectos.manage",
      "publicaciones.view",
      "publicaciones.manage",
      "grupos.view",
      "grupos.manage",
      "reportes.view",
      "reportes.export",
      "catalogos.view",
      "geo.view",
      "org_units.view",
      "org_units.manage",
      "vocabularios.view",
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
      "dashboard.view",
      "investigadores.view",
      "proyectos.view",
      "publicaciones.view",
      "grupos.view",
      "reportes.view",
      "geo.view",
      "org_units.view",
      "vocabularios.view",
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
      "dashboard.view",
      "investigadores.view",
      "proyectos.view",
      "proyectos.manage",
      "publicaciones.view",
      "reportes.view",
      "reportes.export",
      "org_units.view",
      "vocabularios.view",
    ],
    modules: ["Panel", "Investigadores", "Proyectos", "Publicaciones", "Reportes", "Unidades Org."],
  },
};

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
