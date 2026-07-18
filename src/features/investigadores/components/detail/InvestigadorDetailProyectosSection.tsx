import { GraduationCap, TriangleAlert } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { messages } from "@/shared/feedback/messages";
import type { InvestigadorDetalle } from "../../api";

interface InvestigadorDetailProyectosSectionProps {
  investigador: InvestigadorDetalle;
}

export const InvestigadorDetailProyectosSection: React.FC<
  InvestigadorDetailProyectosSectionProps
> = ({ investigador }) => {
  const proyectos = investigador.proyectos ? investigador.proyectos.split(" | ") : [];

  if (proyectos.length === 0) {
    return (
      <div className="screen-placeholder-card">
        <p className="title-with-icon">
          <AppIcon icon={TriangleAlert} size={18} />
          <span>{messages.investigadores.sinProyectosAsignados}</span>
        </p>
      </div>
    );
  }

  return (
    <div className="screen-section">
      <h3 className="screen-section-title">
        <AppIcon icon={GraduationCap} size={18} />
        <span>{messages.investigadores.proyectosEnParticipa}</span>
      </h3>
      <div className="screen-readonly-list">
        {proyectos.map((proyecto, idx) => (
          <div key={idx} className="screen-readonly-item">
            <span className="proyecto-number">{idx + 1}</span>
            <span className="proyecto-title">{proyecto}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
