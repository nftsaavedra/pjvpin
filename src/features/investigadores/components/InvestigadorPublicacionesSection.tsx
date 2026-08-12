import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp, ExternalLink, RefreshCw } from "lucide-react";
import type { Publicacion, SyncPublicacionesResult } from "../api";
import {
  getPublicacionesInvestigador,
  sincronizarPublicacionesPure,
  getTauriErrorMessage,
} from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { InlineIconButton } from "@/shared/ui/InlineIconButton";
import { SkeletonBlock } from "@/shared/ui/Skeleton";
import { toast } from "@/shared/feedback/toast";
import { messages } from "@/shared/feedback/messages";
import { parseAutores } from "@/shared/utils/investigadorUtils";
import { openExternalUrl } from "@/shared/utils/linkUtils";

interface InvestigadorPublicacionesSectionProps {
  investigadorId: string;
  scopusAuthorId: string | null | undefined;
  canSyncPure: boolean;
}

const isNotConfiguredError = (errorMessage: string): boolean =>
  /PURE_API_KEY|api.?key|pure|config/i.test(errorMessage) &&
  /no.?config|falt|missing|not configured/i.test(errorMessage);

export const InvestigadorPublicacionesSection: React.FC<InvestigadorPublicacionesSectionProps> = ({
  investigadorId,
  scopusAuthorId,
  canSyncPure,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pureNoConfigurado, setPureNoConfigurado] = useState(false);
  const tieneScopusId = Boolean(scopusAuthorId);

  const load = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const data = await getPublicacionesInvestigador(investigadorId);
      setPublicaciones(data);
    } catch (error) {
      toast.error(getTauriErrorMessage(error));
      setPublicaciones([]);
    } finally {
      setIsLoading(false);
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
      setPureNoConfigurado(false);
      if (result.totalEncontradas === 0) {
        toast.warning(messages.investigadores.publicaciones.pureSinResultados);
      } else {
        toast.success(
          messages.investigadores.publicaciones.pureSyncSuccess(
            result.nuevas,
            result.actualizadas,
            result.totalEncontradas,
          ),
        );
      }
      await load();
    } catch (error) {
      const errorMessage = getTauriErrorMessage(error);
      if (isNotConfiguredError(errorMessage)) {
        setPureNoConfigurado(true);
        toast.error(messages.investigadores.publicaciones.pureNoConfigurado);
      } else {
        toast.error(`${messages.investigadores.publicaciones.pureError}: ${errorMessage}`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="renacyt-detail-card">
      <button
        type="button"
        className="renacyt-detail-toggle"
        onClick={() => {
          void handleToggle();
        }}
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
                onClick={() => {
                  void handleSync();
                }}
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

          {pureNoConfigurado && (
            <div className="inline-feedback inline-feedback-warning renacyt-formaciones-feedback">
              <span>{messages.investigadores.publicaciones.pureNoConfigurado}</span>
            </div>
          )}

          {isLoading && (
            <div className="space-y-2" aria-live="polite">
              <SkeletonBlock className="skeleton skeleton-line" />
              <SkeletonBlock className="skeleton skeleton-line" />
              <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
            </div>
          )}

          {!isLoading && loaded && publicaciones.length === 0 && (
            <EmptyState
              variant="empty"
              message={messages.investigadores.publicaciones.sinPublicaciones}
            />
          )}

          {publicaciones.length > 0 && (
            <div className="renacyt-formaciones-list">
              {publicaciones.map((pub) => (
                <article key={pub.idPublicacion} className="renacyt-formacion-card">
                  <div className="renacyt-formacion-head">
                    <strong>{pub.titulo}</strong>
                    {pub.anioPublicacion && <Badge variant="info">{pub.anioPublicacion}</Badge>}
                  </div>
                  <div className="renacyt-formacion-grid">
                    {pub.tipoPublicacion && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.tipo}</strong>{" "}
                        {pub.tipoPublicacion}
                      </span>
                    )}
                    {pub.journalTitulo && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.journal}</strong>{" "}
                        {pub.journalTitulo}
                      </span>
                    )}
                    {pub.estadoPublicacion && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.estado}</strong>{" "}
                        {pub.estadoPublicacion}
                      </span>
                    )}
                    {pub.doi && (
                      <span>
                        <strong>{messages.investigadores.publicaciones.fields.doi}</strong>{" "}
                        <InlineIconButton
                          icon={ExternalLink}
                          label={messages.investigadores.publicaciones.abrirDoi}
                          onClick={() => {
                            void openExternalUrl(
                              `https://doi.org/${pub.doi}`,
                              messages.investigadores.publicaciones.doiEnlaceError,
                            );
                          }}
                        />
                        {pub.doi}
                      </span>
                    )}
                    {pub.autoresJson && parseAutores(pub.autoresJson).length > 0 && (
                      <span className="renacyt-formacion-full-col">
                        <strong>{messages.investigadores.publicaciones.fields.autores}</strong>{" "}
                        {parseAutores(pub.autoresJson).join("; ")}
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
