import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from "lucide-react";
import { openUrl } from "@tauri-apps/plugin-opener";
import type { Publicacion, SyncPublicacionesResult } from "../api";
import {
  getPublicacionesInvestigador,
  sincronizarPublicacionesPure,
  getTauriErrorMessage,
} from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { InlineIconButton } from "@/shared/ui/InlineIconButton";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { parseAutores } from "@/shared/utils/investigadorUtils";

interface InvestigadorPublicacionesSectionProps {
  investigadorId: string;
  scopusAuthorId: string | null | undefined;
  canSyncPure: boolean;
}

export const InvestigadorPublicacionesSection: React.FC<InvestigadorPublicacionesSectionProps> = ({
  investigadorId,
  scopusAuthorId,
  canSyncPure,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const tieneScopusId = Boolean(scopusAuthorId);

  const load = async (): Promise<void> => {
    try {
      const data = await getPublicacionesInvestigador(investigadorId);
      setPublicaciones(data);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
      setPublicaciones([]);
    } finally {
      setLoaded(true);
    }
  };

  const handleToggle = async (): Promise<void> => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded) {
      await load();
    }
  };

  const handleSync = async (): Promise<void> => {
    setIsSyncing(true);
    try {
      const result: SyncPublicacionesResult = await sincronizarPublicacionesPure(investigadorId);
      toast.success(
        messages.investigadores.publicaciones.pureSyncSuccess(
          result.nuevas,
          result.actualizadas,
          result.total_encontradas,
        ),
      );
      await load();
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleOpenExternal = async (url: string, errorMsg: string): Promise<void> => {
    try {
      await openUrl(url);
    } catch {
      toast.error(errorMsg);
    }
  };

  return (
    <div className="renacyt-detail-card">
      <button
        type="button"
        className="renacyt-detail-toggle"
        onClick={() => void handleToggle()}
        aria-expanded={expanded}
      >
        <span className="renacyt-detail-toggle-copy">
          <span className="title-with-icon renacyt-detail-title">
            <AppIcon icon={BookOpen} size={18} />
            <span>{messages.investigadores.publicaciones.sectionTitle}</span>
          </span>
          {loaded && <Badge variant="info">{publicaciones.length}</Badge>}
        </span>
        <span className="renacyt-detail-toggle-icon" aria-hidden="true">
          <AppIcon icon={expanded ? ChevronUp : ChevronDown} size={18} />
        </span>
      </button>

      {expanded && (
        <>
          {!tieneScopusId && (
            <div className="inline-feedback inline-feedback-warning renacyt-formaciones-feedback">
              <span>{messages.investigadores.publicaciones.sinScopusId}</span>
            </div>
          )}

          {tieneScopusId && canSyncPure && (
            <div className="renacyt-detail-actions">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => void handleSync()}
                disabled={isSyncing}
              >
                <span className="button-with-icon">
                  <AppIcon icon={RefreshCw} size={16} />
                  <span>
                    {isSyncing
                      ? messages.investigadores.publicaciones.sincronizando
                      : messages.investigadores.publicaciones.sincronizarDesde}
                  </span>
                </span>
              </button>
            </div>
          )}

          {loaded && publicaciones.length === 0 && (
            <p className="renacyt-detail-empty">
              {messages.investigadores.publicaciones.sinPublicaciones}
            </p>
          )}

          {publicaciones.length > 0 && (
            <div className="renacyt-formaciones-list">
              {publicaciones.map((pub) => (
                <article key={pub.id_publicacion} className="renacyt-formacion-card">
                  <div className="renacyt-formacion-head">
                    <strong>{pub.titulo}</strong>
                    {pub.anio_publicacion && <Badge variant="info">{pub.anio_publicacion}</Badge>}
                  </div>
                  <div className="renacyt-formacion-grid">
                    {pub.tipo_publicacion && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.tipo}</strong>{" "}
                        {pub.tipo_publicacion}
                      </span>
                    )}
                    {pub.journal_titulo && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.journal}</strong>{" "}
                        {pub.journal_titulo}
                      </span>
                    )}
                    {pub.estado_publicacion && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.estado}</strong>{" "}
                        {pub.estado_publicacion}
                      </span>
                    )}
                    {pub.doi && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.doi}</strong>{" "}
                        <InlineIconButton
                          icon={ExternalLink}
                          label={messages.investigadores.publicaciones.abrirDoi}
                          onClick={() =>
                            void handleOpenExternal(
                              `https://doi.org/${pub.doi}`,
                              messages.investigadores.publicaciones.doiEnlaceError,
                            )
                          }
                        />
                        {pub.doi}
                      </span>
                    )}
                    {pub.autores_json && parseAutores(pub.autores_json).length > 0 && (
                      <span className="renacyt-formacion-full-col">
                        <strong>{messages.investigadores.publicaciones.fields.autores}</strong>{" "}
                        {parseAutores(pub.autores_json).join("; ")}
                      </span>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
