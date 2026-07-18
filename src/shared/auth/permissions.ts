export type AppRole = "superuser" | "admin" | "operador" | "consulta" | "responsable_proyecto";

export type AppPermission =
  | "dashboard.view"
  | "investigadores.view"
  | "investigadores.manage"
  | "proyectos.view"
  | "proyectos.manage"
  | "grupos.view"
  | "grupos.manage"
  | "reportes.view"
  | "reportes.export"
  | "configuracion.view"
  | "grados.manage"
  | "catalogos.view"
  | "catalogos.manage"
  | "usuarios.manage";

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
      "grupos.view",
      "grupos.manage",
      "reportes.view",
      "reportes.export",
      "configuracion.view",
      "grados.manage",
      "catalogos.view",
      "catalogos.manage",
      "usuarios.manage",
    ],
    modules: [
      "Dashboard",
      "Investigadores",
      "Proyectos",
      "Grupos",
      "Recursos",
      "Reportes",
      "Grados",
      "Catálogos",
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
      "grupos.view",
      "grupos.manage",
      "reportes.view",
      "reportes.export",
      "configuracion.view",
      "grados.manage",
      "catalogos.view",
      "catalogos.manage",
      "usuarios.manage",
    ],
    modules: [
      "Dashboard",
      "Investigadores",
      "Proyectos",
      "Grupos",
      "Recursos",
      "Reportes",
      "Grados",
      "Catálogos",
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
      "grupos.view",
      "grupos.manage",
      "reportes.view",
      "reportes.export",
      "catalogos.view",
    ],
    modules: ["Dashboard", "Investigadores", "Proyectos", "Grupos", "Recursos", "Reportes"],
  },
  consulta: {
    label: "Consulta",
    summary: "Solo lectura de la información operativa.",
    permissions: [
      "dashboard.view",
      "investigadores.view",
      "proyectos.view",
      "grupos.view",
      "reportes.view",
    ],
    modules: ["Dashboard", "Investigadores", "Proyectos", "Grupos", "Reportes"],
  },
  responsable_proyecto: {
    label: "Resp. Proyecto",
    summary: "Acceso a sus proyectos como responsable.",
    permissions: [
      "dashboard.view",
      "investigadores.view",
      "proyectos.view",
      "proyectos.manage",
      "reportes.view",
      "reportes.export",
    ],
    modules: ["Dashboard", "Investigadores", "Proyectos", "Reportes"],
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

export const getRoleDefinition = (value: string | null | undefined) =>
  ROLE_DEFINITIONS[normalizeAppRole(value)];

export const hasPermission = (role: string | null | undefined, permission: AppPermission) =>
  ROLE_DEFINITIONS[normalizeAppRole(role)].permissions.includes(permission);

export const getRoleOptions = () =>
  Object.entries(ROLE_DEFINITIONS).map(([value, definition]) => ({
    value,
    label: definition.label,
  }));
