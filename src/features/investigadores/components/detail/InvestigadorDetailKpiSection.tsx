import { BadgeCheck, BarChart3, GraduationCap } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { formatRenacytNivel } from "@/shared/utils/renacyt";
import { messages } from "@/shared/feedback/messages";
import type { InvestigadorDetalle } from "../../api";

interface InvestigadorDetailKpiSectionProps {
  investigador: InvestigadorDetalle;
}

export const InvestigadorDetailKpiSection: React.FC<InvestigadorDetailKpiSectionProps> = ({
  investigador,
}) => (
  <>
    <div className="screen-kpis">
      <div className="screen-kpi-card">
        <div className="screen-kpi-icon">
          <AppIcon icon={GraduationCap} size={18} />
        </div>
        <div className="screen-kpi-copy">
          <span className="screen-kpi-value">
            {investigador.grado || messages.investigadores.fallbacks.sinGrado}
          </span>
          <span className="screen-kpi-label">{messages.investigadores.kpiLabels.grado}</span>
        </div>
      </div>
      <div className="screen-kpi-card">
        <div className="screen-kpi-icon">
          <AppIcon icon={BadgeCheck} size={18} />
        </div>
        <div className="screen-kpi-copy">
          <span className="screen-kpi-value">
            {formatRenacytNivel(investigador.renacytNivel) ??
              messages.investigadores.fallbacks.sinRenacyt}
          </span>
          <span className="screen-kpi-label">{messages.investigadores.kpiLabels.nivelRenacyt}</span>
        </div>
      </div>
      <div className="screen-kpi-card">
        <div className="screen-kpi-icon">
          <AppIcon icon={BadgeCheck} size={18} />
        </div>
        <div className="screen-kpi-copy">
          <span className="screen-kpi-value">
            {investigador.activo === 1 ? messages.ui.statusActivo : messages.ui.statusInactivo}
          </span>
          <span className="screen-kpi-label">{messages.investigadores.kpiLabels.estado}</span>
        </div>
      </div>
      <div className="screen-kpi-card">
        <div className="screen-kpi-icon">
          <AppIcon icon={GraduationCap} size={18} />
        </div>
        <div className="screen-kpi-copy">
          <span className="screen-kpi-value">{investigador.cantidadProyectos}</span>
          <span className="screen-kpi-label">{messages.investigadores.kpiLabels.proyectos}</span>
        </div>
      </div>
    </div>

    <div className="screen-placeholder-card">
      <p className="title-with-icon">
        <AppIcon icon={BarChart3} size={20} />
        <span>{messages.investigadores.metricasPronto}</span>
      </p>
    </div>
  </>
);
