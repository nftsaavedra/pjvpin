import {
  BookText,
  FileSpreadsheet,
  FolderOpen,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type TabGroup = "operativa" | "sistema";

export interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  permission: string;
  group?: TabGroup;
}

export const TAB_DEFINITIONS: TabDef[] = [
  {
    id: "dashboard",
    label: "Panel",
    icon: LayoutDashboard,
    description: "Indicadores clave",
    permission: "dashboard.view",
    group: "operativa",
  },
  {
    id: "proyectos",
    label: "Proyectos",
    icon: FolderOpen,
    description: "Alta y seguimiento",
    permission: "proyectos.view",
    group: "operativa",
  },
  {
    id: "investigadores",
    label: "Investigadores",
    icon: GraduationCap,
    description: "Registro y estado",
    permission: "investigadores.view",
    group: "operativa",
  },
  {
    id: "publicaciones",
    label: "Publicaciones",
    icon: BookText,
    description: "Publicaciones científicas (Pure)",
    permission: "publicaciones.view",
    group: "operativa",
  },
  {
    id: "grupos",
    label: "Grupos",
    icon: Users,
    description: "Investigación coordinada",
    permission: "grupos.view",
    group: "operativa",
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: FileSpreadsheet,
    description: "Vista previa y exportación",
    permission: "reportes.view",
    group: "operativa",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings2,
    description: "Accesos y catálogos",
    permission: "configuracion.view",
    group: "sistema",
  },
];

export const TAB_HEADER_META: Record<string, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Panel",
    subtitle: "Carga de investigadores y proyectos en una sola vista.",
  },
  proyectos: {
    title: "Proyectos",
    subtitle: "Alta, asignación y seguimiento de proyectos.",
  },
  investigadores: {
    title: "Investigadores",
    subtitle: "Registro, estado y trazabilidad del investigador.",
  },
  publicaciones: {
    title: "Publicaciones",
    subtitle: "Publicaciones científicas consolidadas (Pure / CONCYTEC).",
  },
  grupos: {
    title: "Grupos de Investigación",
    subtitle: "Coordinación y líneas de investigación.",
  },
  reportes: {
    title: "Reportes",
    subtitle: "Vista previa, filtros y exportación.",
  },
  configuracion: {
    title: "Configuración",
    subtitle: "Accesos y catálogos del sistema.",
  },
};
