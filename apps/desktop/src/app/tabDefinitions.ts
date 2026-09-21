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
import { AppPermission } from "@/shared/auth/permissions";

export type TabGroup = "operativa" | "sistema";

export interface TabDef {
  id: string;
  label: string;
  icon: LucideIcon;
  description: string;
  permission: AppPermission;
  group?: TabGroup;
}

export const TAB_DEFINITIONS: TabDef[] = [
  {
    id: "dashboard",
    label: "Panel",
    icon: LayoutDashboard,
    description: "Indicadores clave",
    permission: AppPermission.DashboardView,
    group: "operativa",
  },
  {
    id: "proyectos",
    label: "Proyectos",
    icon: FolderOpen,
    description: "Alta y seguimiento",
    permission: AppPermission.ProyectosView,
    group: "operativa",
  },
  {
    id: "investigadores",
    label: "Investigadores",
    icon: GraduationCap,
    description: "Registro y estado",
    permission: AppPermission.InvestigadoresView,
    group: "operativa",
  },
  {
    id: "publicaciones",
    label: "Publicaciones",
    icon: BookText,
    description: "Publicaciones científicas (Pure)",
    permission: AppPermission.PublicacionesView,
    group: "operativa",
  },
  {
    id: "grupos",
    label: "Grupos",
    icon: Users,
    description: "Investigación coordinada",
    permission: AppPermission.GruposView,
    group: "operativa",
  },
  {
    id: "reportes",
    label: "Reportes",
    icon: FileSpreadsheet,
    description: "Vista previa y exportación",
    permission: AppPermission.ReportesView,
    group: "operativa",
  },
  {
    id: "configuracion",
    label: "Configuración",
    icon: Settings2,
    description: "Accesos y catálogos",
    permission: AppPermission.UsuariosManage,
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
