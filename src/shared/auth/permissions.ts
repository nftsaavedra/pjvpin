export type AppRole = 'superuser' | 'admin' | 'operador' | 'consulta' | 'responsable_proyecto';

export type AppPermission =
  | 'dashboard.view'
  | 'docentes.view'
  | 'docentes.manage'
  | 'proyectos.view'
  | 'proyectos.manage'
  | 'grupos.view'
  | 'grupos.manage'
  | 'reportes.view'
  | 'reportes.export'
  | 'configuracion.view'
  | 'grados.manage'
  | 'usuarios.manage';

interface RoleDefinition {
  label: string;
  summary: string;
  permissions: AppPermission[];
  capabilities: string[];
}

export const ROLE_DEFINITIONS: Record<string, RoleDefinition> = {
  superuser: {
    label: 'Superusuario',
    summary: 'Nivel root del sistema. Control total de configuracion y accesos.',
    permissions: [
      'dashboard.view',
      'docentes.view',
      'docentes.manage',
      'proyectos.view',
      'proyectos.manage',
      'grupos.view',
      'grupos.manage',
      'reportes.view',
      'reportes.export',
      'configuracion.view',
      'grados.manage',
      'usuarios.manage',
    ],
    capabilities: [
      'Control total del sistema.',
      'Configuracion de servicios externos.',
      'Unico en el sistema, inmutable desde la UI.',
    ],
  },
  admin: {
    label: 'Administrador',
    summary: 'Control total del sistema, accesos y catalogos base.',
    permissions: [
      'dashboard.view',
      'docentes.view',
      'docentes.manage',
      'proyectos.view',
      'proyectos.manage',
      'grupos.view',
      'grupos.manage',
      'reportes.view',
      'reportes.export',
      'configuracion.view',
      'grados.manage',
      'usuarios.manage',
    ],
    capabilities: [
      'Gestiona usuarios, roles y estado de acceso.',
      'Administra grados academicos y todo el dato operativo.',
      'Puede crear, actualizar, desactivar, reactivar y exportar.',
    ],
  },
  operador: {
    label: 'Operador',
    summary: 'Gestion operativa diaria de docentes y proyectos.',
    permissions: [
      'dashboard.view',
      'docentes.view',
      'docentes.manage',
      'proyectos.view',
      'proyectos.manage',
      'grupos.view',
      'grupos.manage',
      'reportes.view',
      'reportes.export',
    ],
    capabilities: [
      'Gestiona docentes, proyectos, grupos y sincronizaciones operativas.',
      'Consulta dashboard y reportes con opcion de exportar.',
      'No administra usuarios ni catalogos de configuracion.',
    ],
  },
  consulta: {
    label: 'Consulta',
    summary: 'Acceso de solo lectura a la informacion operativa.',
    permissions: [
      'dashboard.view',
      'docentes.view',
      'proyectos.view',
      'grupos.view',
      'reportes.view',
    ],
    capabilities: [
      'Visualiza dashboard, docentes, proyectos, grupos y reportes.',
      'No puede crear, editar, desactivar, reactivar ni sincronizar.',
      'No puede exportar ni acceder a configuracion.',
    ],
  },
  responsable_proyecto: {
    label: 'Resp. Proyecto',
    summary: 'Acceso a proyectos donde es responsable.',
    permissions: [
      'dashboard.view',
      'docentes.view',
      'proyectos.view',
      'proyectos.manage',
      'reportes.view',
      'reportes.export',
    ],
    capabilities: [
      'Ve y gestiona solo los proyectos donde es responsable.',
      'Accede a docentes y recursos de sus proyectos.',
      'Puede exportar reportes de sus proyectos.',
    ],
  },
};

export const normalizeAppRole = (value: string | null | undefined): string => {
  const normalizedValue = (value ?? '').trim().toLowerCase();

  if (ROLE_DEFINITIONS[normalizedValue]) {
    return normalizedValue;
  }

  return 'consulta';
};

export const getRoleLabel = (value: string | null | undefined) =>
  ROLE_DEFINITIONS[normalizeAppRole(value)]?.label ?? 'Desconocido';

export const getRoleDefinition = (value: string | null | undefined) =>
  ROLE_DEFINITIONS[normalizeAppRole(value)] ?? ROLE_DEFINITIONS.consulta;

export const hasPermission = (role: string | null | undefined, permission: AppPermission) =>
  (ROLE_DEFINITIONS[normalizeAppRole(role)]?.permissions ?? []).includes(permission);

export const getRoleOptions = () =>
  (Object.entries(ROLE_DEFINITIONS)).map(([value, definition]) => ({
    value,
    label: definition.label,
  }));
