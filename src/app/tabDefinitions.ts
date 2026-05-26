import {
  FileSpreadsheet,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  permission: string;
}

export const TAB_DEFINITIONS: TabDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "Indicadores clave",
    permission: "dashboard.view",
  },
  {
    id: "proyectos",
    label: "Proyectos",
    icon: FolderOpen,
    description: "Alta y seguimiento",
    permission: "proyectos.view",
  },
  {
    id: "docentes",
    label: "Docentes",
    icon: GraduationCap,
    description: "Registro y estado",
    permission: "docentes.view",
  },
  {
    id: "grupos",
    label: "Grupos",
    icon: Users,
    description: "Investigación coordinada",
    permission: "grupos.view",
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: FileSpreadsheet,
    description: "Vista previa y exportación",
    permission: "reportes.view",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings2,
    description: "Accesos y catálogos",
    permission: "configuracion.view",
  },
];

export const TAB_HEADER_META: Record<string, { kicker: string; title: string; subtitle: string }> =
  {
    dashboard: {
      kicker: "Indicadores clave",
      title: "Dashboard",
      subtitle: "Carga docente y proyectos en una sola vista.",
    },
    proyectos: {
      kicker: "Gestión operativa",
      title: "Proyectos",
      subtitle: "Alta, asignación y seguimiento de proyectos.",
    },
    docentes: {
      kicker: "Gestión operativa",
      title: "Docentes",
      subtitle: "Registro, estado y trazabilidad docente.",
    },
    grupos: {
      kicker: "Investigación",
      title: "Grupos de Investigación",
      subtitle: "Coordinación y líneas de investigación.",
    },
    reportes: {
      kicker: "Análisis y salida",
      title: "Reportes",
      subtitle: "Vista previa, filtros y exportación.",
    },
    configuracion: {
      kicker: "Administración base",
      title: "Configuración",
      subtitle: "Accesos y catálogos del sistema.",
    },
  };
