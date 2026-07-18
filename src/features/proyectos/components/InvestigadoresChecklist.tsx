import React, { useDeferredValue, useId, useState } from "react";
import { X } from "lucide-react";
import { type InvestigadorDetalle } from "../../investigadores/api";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { SkeletonChecklist } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";

interface InvestigadoresChecklistProps {
  investigadores: InvestigadorDetalle[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  onToggleInvestigador?: (investigador: InvestigadorDetalle, nextSelected: boolean) => void;
  responsableId?: string | null;
  loading?: boolean;
  refreshing?: boolean;
  showSelectedMeta?: boolean;
  showRequiredError?: boolean;
}

const normalizeText = (value: string | null | undefined) => (value ?? "").trim().toLowerCase();

export const InvestigadoresChecklist: React.FC<InvestigadoresChecklistProps> = ({
  investigadores,
  selectedIds,
  onChange,
  onToggleInvestigador,
  responsableId = null,
  loading = false,
  refreshing = false,
  showSelectedMeta = true,
  showRequiredError = true,
}) => {
  const searchId = useId();
  const helperId = useId();
  const resultsId = useId();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(normalizeText(query));

  useRefreshToast({
    refreshing,
    message: "Actualizando lista de investigadores",
    toastKey: "investigadores-checklist-refresh",
    cooldownMs: 120000,
  });

  const handleToggle = (id: string) => {
    const investigador = investigadores.find((item) => item.id_investigador === id);
    if (!investigador) {
      return;
    }

    const nextSelected = !selectedIds.includes(id);
    if (onToggleInvestigador) {
      onToggleInvestigador(investigador, nextSelected);
      return;
    }

    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((x) => x !== id));
    } else {
      onChange([...selectedIds, id]);
    }
  };

  const investigadoresSeleccionados = investigadores.filter((investigador) =>
    selectedIds.includes(investigador.id_investigador),
  );
  const requiereBusquedaMinima = investigadores.length > 25 && deferredQuery.length < 2;
  const coincidencias = requiereBusquedaMinima
    ? []
    : investigadores.filter((investigador) => {
        if (!deferredQuery)
          return investigadores.length <= 25 && !selectedIds.includes(investigador.id_investigador);

        const nombre = normalizeText(investigador.nombres_apellidos);
        const dni = normalizeText(investigador.dni);
        const grado = normalizeText(investigador.grado);
        const nivelRenacyt = normalizeRenacytNivelSearch(investigador.renacyt_nivel);

        return (
          nombre.includes(deferredQuery) ||
          dni.includes(deferredQuery) ||
          grado.includes(deferredQuery) ||
          nivelRenacyt.includes(deferredQuery)
        );
      });
  const investigadoresVisibles = coincidencias.slice(0, 8);
  const hayMasResultados = coincidencias.length > investigadoresVisibles.length;

  const limpiarSeleccion = () => {
    onChange([]);
  };

  if (loading && investigadores.length === 0) {
    return <SkeletonChecklist />;
  }

  if (investigadores.length === 0) {
    return <div className="empty-state">No hay investigadores registrados.</div>;
  }

  return (
    <div className="form-group">
      <div className="field-header">
        <label htmlFor={searchId}>Seleccionar Investigadores *</label>
      </div>
      <div className="investigadores-selector">
        <div className="investigadores-selector-toolbar">
          <input
            id={searchId}
            className="form-input investigadores-selector-search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder="Buscar investigador por nombre, DNI, grado o nivel RENACYT"
            aria-describedby={helperId}
            aria-controls={resultsId}
          />
          <div className="investigadores-selector-meta">
            <StatusChip variant="total">Disponibles: {investigadores.length}</StatusChip>
            <StatusChip variant="success">Seleccionados: {selectedIds.length}</StatusChip>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="btn-secondary investigadores-selector-clear"
                onClick={limpiarSeleccion}
              >
                Limpiar selección
              </button>
            )}
          </div>
        </div>

        <div id={helperId} className="sr-only">
          Busque investigadores por nombre, DNI, grado o nivel RENACYT, y use los botones para
          agregarlos o quitarlos de la selección.
        </div>

        <div className="investigadores-selected-list" aria-live="polite">
          {investigadoresSeleccionados.length > 0 ? (
            investigadoresSeleccionados.map((investigador) => (
              <button
                key={investigador.id_investigador}
                type="button"
                className="investigador-chip"
                onClick={() => {
                  handleToggle(investigador.id_investigador);
                }}
                title="Quitar de la selección"
              >
                <span className="investigador-chip-content">
                  <span className="investigador-chip-name">{investigador.nombres_apellidos}</span>
                  {showSelectedMeta && (
                    <span className="investigador-chip-meta">
                      {investigador.grado || "Sin grado"} ·{" "}
                      {formatRenacytNivel(investigador.renacyt_nivel)
                        ? `RENACYT ${formatRenacytNivel(investigador.renacyt_nivel)}`
                        : "Sin nivel RENACYT"}
                      {responsableId === investigador.id_investigador ? " · Responsable" : ""}
                    </span>
                  )}
                  {!showSelectedMeta && responsableId === investigador.id_investigador && (
                    <span className="investigador-chip-meta investigador-chip-meta-compact">
                      Responsable actual
                    </span>
                  )}
                </span>
                <span className="investigador-chip-remove">
                  <AppIcon icon={X} size={14} />
                </span>
              </button>
            ))
          ) : (
            <div className="investigadores-selector-empty">
              Aún no ha seleccionado investigadores para este proyecto.
            </div>
          )}
        </div>

        <div
          id={resultsId}
          className="investigadores-checklist investigadores-selector-results"
          aria-label="Resultados de investigadores"
        >
          {requiereBusquedaMinima ? (
            <div className="investigadores-selector-empty">
              Escriba al menos 2 caracteres para buscar dentro de una lista grande de
              investigadores.
            </div>
          ) : !deferredQuery && investigadores.length > 25 ? (
            <div className="investigadores-selector-empty">
              Use el buscador para encontrar investigadores y agregarlos al proyecto sin recorrer
              una lista completa.
            </div>
          ) : investigadoresVisibles.length === 0 ? (
            <div className="investigadores-selector-empty">
              No se encontraron investigadores con ese criterio.
            </div>
          ) : (
            <>
              {investigadoresVisibles.map((investigador) => {
                const seleccionado = selectedIds.includes(investigador.id_investigador);

                return (
                  <button
                    key={investigador.id_investigador}
                    type="button"
                    className={`checkbox-item investigador-option ${seleccionado ? "selected" : ""}`}
                    onClick={() => {
                      handleToggle(investigador.id_investigador);
                    }}
                    aria-pressed={seleccionado}
                  >
                    <div className="investigador-option-main">
                      <span className="investigador-option-name">
                        {investigador.nombres_apellidos}
                      </span>
                      <span className="investigador-option-dni">DNI: {investigador.dni}</span>
                      <span className="investigador-option-meta">
                        {investigador.grado || "Sin grado"} ·{" "}
                        {formatRenacytNivel(investigador.renacyt_nivel)
                          ? `RENACYT ${formatRenacytNivel(investigador.renacyt_nivel)}`
                          : "Sin nivel RENACYT"}
                      </span>
                    </div>
                    <div className="investigador-option-actions">
                      <Badge variant={seleccionado ? "success" : "info"}>
                        {seleccionado ? "Seleccionado" : "Agregar"}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {hayMasResultados && (
                <div className="investigadores-selector-footnote">
                  Mostrando {investigadoresVisibles.length} de {coincidencias.length} coincidencias.
                  Refine la búsqueda para acotar resultados.
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showRequiredError && selectedIds.length === 0 && (
        <small className="field-error">Seleccione al menos un investigador</small>
      )}
    </div>
  );
};
