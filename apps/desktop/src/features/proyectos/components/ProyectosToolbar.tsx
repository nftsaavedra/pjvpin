import React from "react";
import { FormInput } from "@/shared/forms/FormInput";
import { FormSelect } from "@/shared/forms/FormSelect";
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
    <FormInput
      label={messages.proyectos.toolbar.searchLabel}
      value={busqueda}
      onChange={onBusquedaChange}
      placeholder={messages.proyectos.toolbar.searchPlaceholder}
      containerClassName="filter-bar-search"
      aria-label={messages.proyectos.toolbar.searchAriaLabel}
    />
    <FormSelect
      label={messages.proyectos.toolbar.estadoLabel}
      value={estadoFiltro}
      onChange={(value) => {
        onEstadoFiltroChange(value as "todos" | "activos" | "inactivos");
      }}
      options={[
        { value: "todos", label: messages.proyectos.toolbar.opciones.todos },
        { value: "activos", label: messages.proyectos.toolbar.opciones.soloActivos },
        { value: "inactivos", label: messages.proyectos.toolbar.opciones.soloInactivos },
      ]}
      placeholder="—"
      containerClassName="filter-bar-select"
      aria-label={messages.proyectos.toolbar.filtroEstadoAriaLabel}
    />
  </div>
);
