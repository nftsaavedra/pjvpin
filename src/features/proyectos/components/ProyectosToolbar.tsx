import React from "react";
import { StatusChip } from "@/shared/ui/StatusChip";

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
        <div className="filter-summary">Cargando...</div>
      ) : (
        <>
          <div className="filter-summary">Visibles: {totalVisibles}</div>
          <StatusChip variant="success">Activos: {totalActivos}</StatusChip>
          <StatusChip variant="warning">Inactivos: {totalInactivos}</StatusChip>
          <StatusChip variant="total">Todos: {totalTodos}</StatusChip>
        </>
      )}
    </div>
    <input
      className="form-input filter-search"
      placeholder="Buscar por título o perfil del investigador"
      value={busqueda}
      onChange={(e) => {
        onBusquedaChange(e.target.value);
      }}
      aria-label="Buscar proyectos por título o perfil del investigador"
    />
    <select
      className="form-input filter-select"
      value={estadoFiltro}
      onChange={(e) => {
        onEstadoFiltroChange(e.target.value as "todos" | "activos" | "inactivos");
      }}
      aria-label="Filtrar proyectos por estado"
    >
      <option value="todos">Todos</option>
      <option value="activos">Solo activos</option>
      <option value="inactivos">Solo inactivos</option>
    </select>
  </div>
);
