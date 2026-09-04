import { useMemo, useState } from "react";
import type { ProyectoDetalle } from "../api";

export type EstadoFiltro = "todos" | "activos" | "inactivos";

export function useProyectosListado(proyectos: ProyectoDetalle[]) {
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("activos");
  const [busqueda, setBusqueda] = useState("");

  const totalActivos = useMemo(() => proyectos.filter((p) => p.activo).length, [proyectos]);
  const totalInactivos = useMemo(() => proyectos.filter((p) => !p.activo).length, [proyectos]);

  const proyectosFiltrados = useMemo(
    () =>
      proyectos
        .filter((p) => {
          if (estadoFiltro === "activos") return p.activo;
          if (estadoFiltro === "inactivos") return !p.activo;
          return true;
        })
        .filter((p) => {
          const texto = busqueda.trim().toLowerCase();
          if (!texto) return true;
          return (
            p.titulo_proyecto.toLowerCase().includes(texto) ||
            (p.investigador_responsable || "").toLowerCase().includes(texto) ||
            (p.investigadores || "").toLowerCase().includes(texto)
          );
        }),
    [busqueda, estadoFiltro, proyectos],
  );

  const hasActiveFilters = estadoFiltro !== "activos" || busqueda.trim() !== "";

  const limpiarFiltros = () => {
    setEstadoFiltro("activos");
    setBusqueda("");
  };

  return {
    estadoFiltro,
    setEstadoFiltro,
    busqueda,
    setBusqueda,
    hasActiveFilters,
    limpiarFiltros,
    totalActivos,
    totalInactivos,
    proyectosFiltrados,
  };
}
