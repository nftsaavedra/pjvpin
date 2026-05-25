import { lazy } from "react";

export const DashboardTab = lazy(async () => {
  const module = await import("@/features/dashboard/DashboardTab");
  return { default: module.DashboardTab };
});

export const ProyectosTab = lazy(async () => {
  const module = await import("@/features/proyectos/ProyectosTab");
  return { default: module.ProyectosTab };
});

export const GruposTab = lazy(async () => {
  const module = await import("@/features/grupos/GruposTab");
  return { default: module.GruposTab };
});

export const DocentesTab = lazy(async () => {
  const module = await import("@/features/docentes/DocentesTab");
  return { default: module.DocentesTab };
});

export const ReportesTab = lazy(async () => {
  const module = await import("@/features/reportes/ReportesTab");
  return { default: module.ReportesTab };
});

export const ConfiguracionTab = lazy(async () => {
  const module = await import("@/features/configuracion/ConfiguracionTab");
  return { default: module.ConfiguracionTab };
});
