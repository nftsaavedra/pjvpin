import React from "react";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
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
    <FormInput
      label="Buscar"
      value={busqueda}
      onChange={onBusquedaChange}
      placeholder={messages.investigadores.toolbar.searchPlaceholder}
      containerClassName="filter-bar-search"
      aria-label={messages.investigadores.toolbar.searchAriaLabel}
    />
    <FormSelect
      label="Grado"
      value={gradoFiltro}
      onChange={onGradoFiltroChange}
      options={[
        { value: "todos", label: messages.investigadores.toolbar.opcionesGrado.todos },
        ...gradosDisponibles.map((grado) => ({ value: grado, label: grado })),
      ]}
      placeholder="—"
      containerClassName="filter-bar-select"
      aria-label={messages.investigadores.toolbar.filtroGradoAriaLabel}
    />
    <FormSelect
      label="Nivel RENACYT"
      value={renacytNivelFiltro}
      onChange={onRenacytNivelFiltroChange}
      options={[
        { value: "todos", label: messages.investigadores.toolbar.opcionesNivel.todos },
        ...nivelesRenacytDisponibles.map((nivel) => ({ value: nivel, label: nivel })),
      ]}
      placeholder="—"
      containerClassName="filter-bar-select"
      aria-label={messages.investigadores.toolbar.filtroNivelRenacytAriaLabel}
    />
    <FormSelect
      label="Estado"
      value={estadoFiltro}
      onChange={(value) => {
        onEstadoFiltroChange(value as "todos" | "activos" | "inactivos");
      }}
      options={[
        { value: "todos", label: messages.configuracion.filter.opciones.todos },
        { value: "activos", label: messages.configuracion.filter.opciones.soloActivos },
        { value: "inactivos", label: messages.configuracion.filter.opciones.soloInactivos },
      ]}
      placeholder="—"
      containerClassName="filter-bar-select"
      aria-label={messages.investigadores.toolbar.filtroEstadoAriaLabel}
    />
  </div>
);
