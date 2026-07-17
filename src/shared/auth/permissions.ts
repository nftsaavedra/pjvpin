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
  | "usuarios.manage";

interface RoleDefinition {
  label: string;
  summary: string;
  permissions: AppPermission[];
  capabilities: string[];
}

export const ROLE_DEFINITIONS: Record<AppRole, RoleDefinition> = {
  superuser: {
    label: "Superusuario",
    summary: "Nivel root del sistema. Control total de configuracion y accesos.",
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
      "usuarios.manage",
    ],
    capabilities: [
      "Control total del sistema.",
      "Configuracion de servicios externos.",
      "Unico en el sistema, inmutable desde la UI.",
    ],
  },
  admin: {
    label: "Administrador",
    summary: "Control total del sistema, accesos y catalogos base.",
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
      "usuarios.manage",
    ],
    capabilities: [
      "Gestiona usuarios, roles y estado de acceso.",
      "Administra grados academicos y todo el dato operativo.",
      "Puede crear, actualizar, desactivar, reactivar y exportar.",
    ],
  },
  operador: {
    label: "Operador",
    summary: "Gestion operativa diaria de investigadores y proyectos.",
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
    ],
    capabilities: [
      "Gestiona investigadores, proyectos, grupos y sincronizaciones operativas.",
      "Consulta dashboard y reportes con opcion de exportar.",
      "No administra usuarios ni catalogos de configuracion.",
    ],
  },
  consulta: {
    label: "Consulta",
    summary: "Acceso de solo lectura a la informacion operativa.",
    permissions: [
      "dashboard.view",
      "investigadores.view",
      "proyectos.view",
      "grupos.view",
      "reportes.view",
    ],
    capabilities: [
      "Visualiza dashboard, investigadores, proyectos, grupos y reportes.",
      "No puede crear, editar, desactivar, reactivar ni sincronizar.",
      "No puede exportar ni acceder a configuracion.",
    ],
  },
  responsable_proyecto: {
    label: "Resp. Proyecto",
    summary: "Acceso a proyectos donde es responsable.",
    permissions: [
      "dashboard.view",
      "investigadores.view",
      "proyectos.view",
      "proyectos.manage",
      "reportes.view",
      "reportes.export",
    ],
    capabilities: [
      "Ve y gestiona solo los proyectos donde es responsable.",
      "Accede a investigadores y recursos de sus proyectos.",
      "Puede exportar reportes de sus proyectos.",
    ],
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
