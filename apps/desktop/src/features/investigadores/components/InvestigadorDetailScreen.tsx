import { useEffect, useRef } from "react";
import { ArrowLeft } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { getKardexInvestigador, marcarCambiosRenacytRevisados } from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { messages } from "@/shared/feedback/messages";
import { InvestigadorDetailKpiSection } from "./detail/InvestigadorDetailKpiSection";
import { InvestigadorDetailInfoSection } from "./detail/InvestigadorDetailInfoSection";
import {
  InvestigadorDetailRenacytSection,
  type DescargarConstanciaArgs,
} from "./detail/InvestigadorDetailRenacytSection";
import { InvestigadorDetailKardexSection } from "./detail/InvestigadorDetailKardexSection";
import { InvestigadorDetailProyectosSection } from "./detail/InvestigadorDetailProyectosSection";
import { InvestigadorEventosSection } from "./InvestigadorEventosSection";
import { InvestigadorPublicacionesSection } from "./InvestigadorPublicacionesSection";

interface InvestigadorDetailScreenProps {
  investigador: InvestigadorDetalle;
  currentRol: string | null;
  canRefreshRenacyt: boolean;
  canSyncPure: boolean;
  onBack: () => void;
  onRefreshRenacytFormaciones: (id: string) => void;
  isRefreshingRenacyt: boolean;
  isDownloadingConstancia: boolean;
  onDescargarConstancia: (args: DescargarConstanciaArgs) => void;
}

export const InvestigadorDetailScreen: React.FC<InvestigadorDetailScreenProps> = ({
  investigador,
  currentRol,
  canRefreshRenacyt,
  canSyncPure,
  onBack,
  onRefreshRenacytFormaciones,
  isRefreshingRenacyt,
  isDownloadingConstancia,
  onDescargarConstancia,
}) => {
  // El kardex completo (`getKardexInvestigador`) se carga en background
  // para alimentar el timeline de la ficha; no bloquea el render ni
  // requiere propagarse al padre (la ficha lo consume internamente).
  // `marcarCambiosRenacytRevisados` silencia la alerta del badge en
  // tabla tras la primera apertura de la ficha. Ambos errores se
  // ignoran silenciosamente (best-effort; el DTO ya trae los cambios
  // recientes clasificadorios como fallback).
  const initializedRef = useRef(false);
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    void getKardexInvestigador(investigador.idInvestigador).catch(() => {});
    void marcarCambiosRenacytRevisados(investigador.idInvestigador).catch(() => {});
  }, [investigador.idInvestigador]);

  return (
    <div className="screen-layout">
      <div className="screen-header">
        <div className="screen-header-left">
          <div className="screen-breadcrumb">
            <button
              type="button"
              className="screen-breadcrumb-back"
              onClick={onBack}
              aria-label={messages.investigadores.volverAInvestigadores}
            >
              <AppIcon icon={ArrowLeft} size={14} />
            </button>
            <span>{messages.investigadores.breadcrumb}</span>
            <span className="screen-breadcrumb-sep">/</span>
            <span className="screen-breadcrumb-current">{investigador.nombresApellidos}</span>
          </div>
        </div>
        <div className="screen-header-right">
          <button type="button" className="btn-secondary" onClick={onBack}>
            <span className="button-with-icon">
              <AppIcon icon={ArrowLeft} size={16} />
              <span>{messages.investigadores.volverALista}</span>
            </span>
          </button>
        </div>
      </div>

      <div className="screen-body">
        <InvestigadorDetailKpiSection investigador={investigador} />
        <InvestigadorDetailInfoSection investigador={investigador} />
        <InvestigadorDetailRenacytSection
          investigador={investigador}
          canRefreshRenacyt={canRefreshRenacyt}
          isRefreshingRenacyt={isRefreshingRenacyt}
          isDownloadingConstancia={isDownloadingConstancia}
          onRefreshRenacytFormaciones={onRefreshRenacytFormaciones}
          onDescargarConstancia={onDescargarConstancia}
        />
        <InvestigadorDetailKardexSection cambios={investigador.cambiosRenacytRecientes ?? []} />
        <InvestigadorEventosSection
          investigadorId={investigador.idInvestigador}
          currentRol={currentRol}
          nombreCompleto={investigador.nombresApellidos}
        />
        <InvestigadorPublicacionesSection
          investigadorId={investigador.idInvestigador}
          scopusAuthorId={investigador.renacytScopusAuthorId}
          canSyncPure={canSyncPure}
        />
        <InvestigadorDetailProyectosSection investigador={investigador} />
      </div>
    </div>
  );
};
