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
            (p.docente_responsable || "").toLowerCase().includes(texto) ||
            (p.docentes || "").toLowerCase().includes(texto)
          );
        }),
    [busqueda, estadoFiltro, proyectos],
  );

  return {
    estadoFiltro,
    setEstadoFiltro,
    busqueda,
    setBusqueda,
    totalActivos,
    totalInactivos,
    proyectosFiltrados,
  };
}
