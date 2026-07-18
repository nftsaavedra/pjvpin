import React from "react";
import { StatusChip } from "@/shared/ui/StatusChip";
import { messages } from "@/shared/feedback/messages";

interface ProyectosToolbarProps {
  busqueda: string;
  estadoFiltro: "todos" | "activos" | "inactivos";
  loading?: boolean;
  totalActivos: number;
  totalInactivos: number;
  totalTodos: number;
  totalVisibles: number;
  onBusquedaChange: (value: string) => void;
  onEstadoFiltroChange: (value: "todos" | "activos" | "inactivos") => void;
}

export const ProyectosToolbar: React.FC<ProyectosToolbarProps> = ({
  busqueda,
  estadoFiltro,
  loading = false,
  totalActivos,
  totalInactivos,
  totalTodos,
  totalVisibles,
  onBusquedaChange,
  onEstadoFiltroChange,
}) => (
  <div className="filter-bar">
    <div className="filter-summary-group">
      {loading ? (
        <div className="filter-summary">{messages.proyectos.toolbar.cargando}</div>
      ) : (
        <>
          <div className="filter-summary">{messages.proyectos.toolbar.visibles(totalVisibles)}</div>
          <StatusChip variant="success">
            {messages.proyectos.toolbar.activos(totalActivos)}
          </StatusChip>
          <StatusChip variant="warning">
            {messages.proyectos.toolbar.inactivos(totalInactivos)}
          </StatusChip>
          <StatusChip variant="total">{messages.proyectos.toolbar.todos(totalTodos)}</StatusChip>
        </>
      )}
    </div>
    <input
      className="form-input filter-search"
      placeholder={messages.proyectos.toolbar.searchPlaceholder}
      value={busqueda}
      onChange={(e) => {
        onBusquedaChange(e.target.value);
      }}
      aria-label={messages.proyectos.toolbar.searchAriaLabel}
    />
    <select
      className="form-input filter-select"
      value={estadoFiltro}
      onChange={(e) => {
        onEstadoFiltroChange(e.target.value as "todos" | "activos" | "inactivos");
      }}
      aria-label={messages.proyectos.toolbar.filtroEstadoAriaLabel}
    >
      <option value="todos">{messages.proyectos.toolbar.opciones.todos}</option>
      <option value="activos">{messages.proyectos.toolbar.opciones.soloActivos}</option>
      <option value="inactivos">{messages.proyectos.toolbar.opciones.soloInactivos}</option>
    </select>
  </div>
);
