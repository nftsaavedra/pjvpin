import React from "react";

interface ProyectoDiffPanelProps {
  hasDiff: boolean;
  tituloOriginal: string;
  tituloActual: string;
  responsableOriginalNombre: string | null;
  responsableActualNombre: string | null;
  addedDocentes: string[];
  removedDocentes: string[];
}

export const ProyectoDiffPanel: React.FC<ProyectoDiffPanelProps> = ({
  hasDiff,
  tituloOriginal,
  tituloActual,
  responsableOriginalNombre,
  responsableActualNombre,
  addedDocentes,
  removedDocentes,
}) => (
  <div className="screen-section" aria-label="Resumen visual de cambios pendientes">
    <div className="project-diff-header">
      <strong>Cambios pendientes</strong>
      <span className={`badge ${hasDiff ? "badge-info" : "badge-success"}`}>
        {hasDiff ? "Con cambios" : "Sin cambios"}
      </span>
    </div>
    {!hasDiff ? (
      <p className="project-diff-empty">Todavía no hay diferencias respecto al proyecto actual.</p>
    ) : (
      <div className="project-diff-list">
        {tituloActual.trim() !== tituloOriginal.trim() && (
          <article className="project-diff-row">
            <span className="project-diff-label">Título</span>
            <div className="project-diff-values">
              <span className="project-diff-old">{tituloOriginal || "Sin título"}</span>
              <span className="project-diff-arrow">{"\u2192"}</span>
              <span className="project-diff-new">{tituloActual.trim() || "Sin título"}</span>
            </div>
          </article>
        )}
        {responsableOriginalNombre !== responsableActualNombre && (
          <article className="project-diff-row">
            <span className="project-diff-label">Responsable</span>
            <div className="project-diff-values">
              <span className="project-diff-old">
                {responsableOriginalNombre ?? "Sin responsable"}
              </span>
              <span className="project-diff-arrow">{"\u2192"}</span>
              <span className="project-diff-new">
                {responsableActualNombre ?? "Sin responsable"}
              </span>
            </div>
          </article>
        )}
        {addedDocentes.length > 0 && (
          <article className="project-diff-row">
            <span className="project-diff-label">Agregados</span>
            <div className="project-diff-chip-row">
              {addedDocentes.map((nombre) => (
                <span key={`add-${nombre}`} className="project-diff-chip is-added">
                  {nombre}
                </span>
              ))}
            </div>
          </article>
        )}
        {removedDocentes.length > 0 && (
          <article className="project-diff-row">
            <span className="project-diff-label">Retirados</span>
            <div className="project-diff-chip-row">
              {removedDocentes.map((nombre) => (
                <span key={`remove-${nombre}`} className="project-diff-chip is-removed">
                  {nombre}
                </span>
              ))}
            </div>
          </article>
        )}
      </div>
    )}
  </div>
);
