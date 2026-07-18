import React, { useDeferredValue, useId, useState } from "react";
import { X } from "lucide-react";
import { type InvestigadorDetalle } from "../../investigadores/api";
import { useRefreshToast } from "@/shared/hooks/useRefreshToast";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { SkeletonChecklist } from "@/shared/ui/Skeleton";
import { StatusChip } from "@/shared/ui/StatusChip";
import { formatRenacytNivel, normalizeRenacytNivelSearch } from "@/shared/utils/renacyt";
import { messages } from "@/shared/feedback/messages";

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
    message: messages.proyectos.checklist.refreshMessage,
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
    return <div className="empty-state">{messages.proyectos.checklist.emptyState}</div>;
  }

  return (
    <div className="form-group">
      <div className="field-header">
        <label htmlFor={searchId}>{messages.proyectos.checklist.labelSearch}</label>
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
            placeholder={messages.proyectos.checklist.placeholderSearch}
            aria-describedby={helperId}
            aria-controls={resultsId}
          />
          <div className="investigadores-selector-meta">
            <StatusChip variant="total">
              {messages.proyectos.checklist.chips.disponibles(investigadores.length)}
            </StatusChip>
            <StatusChip variant="success">
              {messages.proyectos.checklist.chips.seleccionados(selectedIds.length)}
            </StatusChip>
            {selectedIds.length > 0 && (
              <button
                type="button"
                className="btn-secondary investigadores-selector-clear"
                onClick={limpiarSeleccion}
              >
                {messages.proyectos.checklist.limpiarSeleccion}
              </button>
            )}
          </div>
        </div>

        <div id={helperId} className="sr-only">
          {messages.proyectos.checklist.srHelper}
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
                title={messages.proyectos.checklist.quitarDeSeleccionTitle}
              >
                <span className="investigador-chip-content">
                  <span className="investigador-chip-name">{investigador.nombres_apellidos}</span>
                  {showSelectedMeta && (
                    <span className="investigador-chip-meta">
                      {investigador.grado || messages.investigadores.fallbacks.sinGrado} ·{" "}
                      {formatRenacytNivel(investigador.renacyt_nivel)
                        ? messages.investigadores.renacytSection.renacytNivel(
                            formatRenacytNivel(investigador.renacyt_nivel) ?? "",
                          )
                        : messages.investigadores.fallbacks.sinNivelRenacyt}
                      {responsableId === investigador.id_investigador
                        ? messages.proyectos.checklist.responsableMeta
                        : ""}
                    </span>
                  )}
                  {!showSelectedMeta && responsableId === investigador.id_investigador && (
                    <span className="investigador-chip-meta investigador-chip-meta-compact">
                      {messages.proyectos.checklist.responsableActual}
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
              {messages.proyectos.checklist.vacio}
            </div>
          )}
        </div>

        <div
          id={resultsId}
          className="investigadores-checklist investigadores-selector-results"
          aria-label={messages.proyectos.checklist.resultadosAriaLabel}
        >
          {requiereBusquedaMinima ? (
            <div className="investigadores-selector-empty">
              {messages.proyectos.checklist.busquedaMinima}
            </div>
          ) : !deferredQuery && investigadores.length > 25 ? (
            <div className="investigadores-selector-empty">
              {messages.proyectos.checklist.busquedaInicial}
            </div>
          ) : investigadoresVisibles.length === 0 ? (
            <div className="investigadores-selector-empty">
              {messages.proyectos.checklist.sinCoincidencias}
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
                        {investigador.grado || messages.investigadores.fallbacks.sinGrado} ·{" "}
                        {formatRenacytNivel(investigador.renacyt_nivel)
                          ? messages.investigadores.renacytSection.renacytNivel(
                              formatRenacytNivel(investigador.renacyt_nivel) ?? "",
                            )
                          : messages.investigadores.fallbacks.sinNivelRenacyt}
                      </span>
                    </div>
                    <div className="investigador-option-actions">
                      <Badge variant={seleccionado ? "success" : "info"}>
                        {seleccionado
                          ? messages.proyectos.checklist.selected
                          : messages.proyectos.checklist.agregar}
                      </Badge>
                    </div>
                  </button>
                );
              })}
              {hayMasResultados && (
                <div className="investigadores-selector-footnote">
                  {messages.proyectos.checklist.contadorRefine(
                    investigadoresVisibles.length,
                    coincidencias.length,
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      {showRequiredError && selectedIds.length === 0 && (
        <small className="field-error">{messages.proyectos.checklist.fieldError}</small>
      )}
    </div>
  );
};
