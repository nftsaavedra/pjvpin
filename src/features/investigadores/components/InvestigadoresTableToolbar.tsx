import React from "react";
import { StatusChip } from "@/shared/ui/StatusChip";

interface InvestigadoresTableToolbarProps {
  busqueda: string;
  estadoFiltro: "todos" | "activos" | "inactivos";
  gradoFiltro: string;
  gradosDisponibles: string[];
  nivelesRenacytDisponibles: string[];
  renacytNivelFiltro: string;
  totalVisibles: number;
  totalTodos: number;
  totalActivos: number;
  totalInactivos: number;
  onBusquedaChange: (value: string) => void;
  onEstadoFiltroChange: (value: "todos" | "activos" | "inactivos") => void;
  onGradoFiltroChange: (value: string) => void;
  onRenacytNivelFiltroChange: (value: string) => void;
}

export const InvestigadoresTableToolbar: React.FC<InvestigadoresTableToolbarProps> = ({
  busqueda,
  estadoFiltro,
  gradoFiltro,
  gradosDisponibles,
  nivelesRenacytDisponibles,
  renacytNivelFiltro,
  totalVisibles,
  totalTodos,
  totalActivos,
  totalInactivos,
  onBusquedaChange,
  onEstadoFiltroChange,
  onGradoFiltroChange,
  onRenacytNivelFiltroChange,
}) => (
  <div className="filter-bar">
    <div className="filter-summary-group">
      <div className="filter-summary">Visibles: {totalVisibles}</div>
      <StatusChip variant="total">Todos: {totalTodos}</StatusChip>
      <StatusChip variant="success">Activos: {totalActivos}</StatusChip>
      <StatusChip variant="warning">Inactivos: {totalInactivos}</StatusChip>
    </div>
    <input
      className="form-input filter-search"
      placeholder="Buscar por nombre, DNI, grado o nivel RENACYT"
      value={busqueda}
      onChange={(e) => {
        onBusquedaChange(e.target.value);
      }}
      aria-label="Buscar investigadores por nombre, DNI, grado o nivel RENACYT"
    />
    <select
      className="form-input filter-select"
      value={gradoFiltro}
      onChange={(e) => {
        onGradoFiltroChange(e.target.value);
      }}
      aria-label="Filtrar investigadores por grado"
    >
      <option value="todos">Todos los grados</option>
      {gradosDisponibles.map((grado) => (
        <option key={grado} value={grado}>
          {grado}
        </option>
      ))}
    </select>
    <select
      className="form-input filter-select"
      value={renacytNivelFiltro}
      onChange={(e) => {
        onRenacytNivelFiltroChange(e.target.value);
      }}
      aria-label="Filtrar investigadores por nivel RENACYT"
    >
      <option value="todos">Todos los niveles RENACYT</option>
      {nivelesRenacytDisponibles.map((nivel) => (
        <option key={nivel} value={nivel}>
          {nivel}
        </option>
      ))}
    </select>
    <select
      className="form-input filter-select"
      value={estadoFiltro}
      onChange={(e) => {
        onEstadoFiltroChange(e.target.value as "todos" | "activos" | "inactivos");
      }}
      aria-label="Filtrar investigadores por estado"
    >
      <option value="todos">Todos</option>
      <option value="activos">Solo activos</option>
      <option value="inactivos">Solo inactivos</option>
    </select>
  </div>
);
