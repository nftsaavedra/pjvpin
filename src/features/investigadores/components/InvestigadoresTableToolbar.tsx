import React from "react";
import { StatusChip } from "@/shared/ui/StatusChip";
import { messages } from "@/shared/feedback/messages";

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
      <div className="filter-summary">{messages.configuracion.filter.visibles(totalVisibles)}</div>
      <StatusChip variant="total">{messages.configuracion.filter.todos(totalTodos)}</StatusChip>
      <StatusChip variant="success">
        {messages.configuracion.filter.activos(totalActivos)}
      </StatusChip>
      <StatusChip variant="warning">
        {messages.configuracion.filter.inactivos(totalInactivos)}
      </StatusChip>
    </div>
    <input
      className="form-input filter-search"
      placeholder="Buscar por nombre, DNI, grado o nivel RENACYT"
      value={busqueda}
      onChange={(e) => {
        onBusquedaChange(e.target.value);
      }}
      aria-label={messages.investigadores.toolbar.searchAriaLabel}
    />
    <select
      className="form-input filter-select"
      value={gradoFiltro}
      onChange={(e) => {
        onGradoFiltroChange(e.target.value);
      }}
      aria-label={messages.investigadores.toolbar.filtroGradoAriaLabel}
    >
      <option value="todos">{messages.investigadores.toolbar.opcionesGrado.todos}</option>
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
      aria-label={messages.investigadores.toolbar.filtroNivelRenacytAriaLabel}
    >
      <option value="todos">{messages.investigadores.toolbar.opcionesNivel.todos}</option>
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
      aria-label={messages.investigadores.toolbar.filtroEstadoAriaLabel}
    >
      <option value="todos">{messages.configuracion.filter.opciones.todos}</option>
      <option value="activos">{messages.configuracion.filter.opciones.soloActivos}</option>
      <option value="inactivos">{messages.configuracion.filter.opciones.soloInactivos}</option>
    </select>
  </div>
);
