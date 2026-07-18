import React from "react";
import { Badge } from "@/shared/ui/Badge";
import { messages } from "@/shared/feedback/messages";

interface ProyectoDiffPanelProps {
  hasDiff: boolean;
  tituloOriginal: string;
  tituloActual: string;
  responsableOriginalNombre: string | null;
  responsableActualNombre: string | null;
  addedInvestigadores: string[];
  removedInvestigadores: string[];
}

export const ProyectoDiffPanel: React.FC<ProyectoDiffPanelProps> = ({
  hasDiff,
  tituloOriginal,
  tituloActual,
  responsableOriginalNombre,
  responsableActualNombre,
  addedInvestigadores,
  removedInvestigadores,
}) => (
  <div className="screen-section" aria-label={messages.proyectos.diffPanel.ariaLabel}>
    <div className="project-diff-header">
      <strong>{messages.proyectos.diffPanel.titulo}</strong>
      <Badge variant={hasDiff ? "info" : "success"}>
        {hasDiff
          ? messages.proyectos.diffPanel.conCambios
          : messages.proyectos.diffPanel.sinCambios}
      </Badge>
    </div>
    {!hasDiff ? (
      <p className="project-diff-empty">{messages.proyectos.diffPanel.vacio}</p>
    ) : (
      <div className="project-diff-list">
        {tituloActual.trim() !== tituloOriginal.trim() && (
          <article className="project-diff-row">
            <span className="project-diff-label">{messages.proyectos.diffPanel.labels.titulo}</span>
            <div className="project-diff-values">
              <span className="project-diff-old">
                {tituloOriginal || messages.proyectos.diffPanel.fallbacks.sinTitulo}
              </span>
              <span className="project-diff-arrow">{"\u2192"}</span>
              <span className="project-diff-new">
                {tituloActual.trim() || messages.proyectos.diffPanel.fallbacks.sinTitulo}
              </span>
            </div>
          </article>
        )}
        {responsableOriginalNombre !== responsableActualNombre && (
          <article className="project-diff-row">
            <span className="project-diff-label">
              {messages.proyectos.diffPanel.labels.responsable}
            </span>
            <div className="project-diff-values">
              <span className="project-diff-old">
                {responsableOriginalNombre ?? messages.proyectos.diffPanel.fallbacks.sinResponsable}
              </span>
              <span className="project-diff-arrow">{"\u2192"}</span>
              <span className="project-diff-new">
                {responsableActualNombre ?? messages.proyectos.diffPanel.fallbacks.sinResponsable}
              </span>
            </div>
          </article>
        )}
        {addedInvestigadores.length > 0 && (
          <article className="project-diff-row">
            <span className="project-diff-label">
              {messages.proyectos.diffPanel.labels.agregados}
            </span>
            <div className="project-diff-chip-row">
              {addedInvestigadores.map((nombre) => (
                <span key={`add-${nombre}`} className="project-diff-chip is-added">
                  {nombre}
                </span>
              ))}
            </div>
          </article>
        )}
        {removedInvestigadores.length > 0 && (
          <article className="project-diff-row">
            <span className="project-diff-label">
              {messages.proyectos.diffPanel.labels.retirados}
            </span>
            <div className="project-diff-chip-row">
              {removedInvestigadores.map((nombre) => (
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
