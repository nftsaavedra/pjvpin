import { ArrowLeft } from "lucide-react";
import type { InvestigadorDetalle } from "../api";
import { AppIcon } from "@/shared/ui/AppIcon";
import { messages } from "@/shared/feedback/messages";
import { InvestigadorDetailKpiSection } from "./detail/InvestigadorDetailKpiSection";
import { InvestigadorDetailInfoSection } from "./detail/InvestigadorDetailInfoSection";
import { InvestigadorDetailRenacytSection } from "./detail/InvestigadorDetailRenacytSection";
import { InvestigadorDetailProyectosSection } from "./detail/InvestigadorDetailProyectosSection";
import { InvestigadorPublicacionesSection } from "./InvestigadorPublicacionesSection";

interface InvestigadorDetailScreenProps {
  investigador: InvestigadorDetalle;
  canRefreshRenacyt: boolean;
  canSyncPure: boolean;
  onBack: () => void;
  onRefreshRenacytFormaciones: (id: string) => void;
  isRefreshingRenacyt: boolean;
}

export const InvestigadorDetailScreen: React.FC<InvestigadorDetailScreenProps> = ({
  investigador,
  canRefreshRenacyt,
  canSyncPure,
  onBack,
  onRefreshRenacytFormaciones,
  isRefreshingRenacyt,
}) => (
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
          <span className="screen-breadcrumb-current">{investigador.nombres_apellidos}</span>
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
        onRefreshRenacytFormaciones={onRefreshRenacytFormaciones}
      />
      <InvestigadorPublicacionesSection
        investigadorId={investigador.id_investigador}
        scopusAuthorId={investigador.renacyt_scopus_author_id}
        canSyncPure={canSyncPure}
      />
      <InvestigadorDetailProyectosSection investigador={investigador} />
    </div>
  </div>
);
