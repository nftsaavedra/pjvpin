import { Badge } from "@/shared/ui/Badge";
import { messages } from "@/shared/feedback/messages";
import type { InvestigadorDetalle } from "../../api";

interface InvestigadorDetailInfoSectionProps {
  investigador: InvestigadorDetalle;
}

export const InvestigadorDetailInfoSection: React.FC<InvestigadorDetailInfoSectionProps> = ({
  investigador,
}) => (
  <div className="screen-section">
    <div className="investigador-info">
      <div className="info-row">
        <label>{messages.investigadores.infoRowLabels.nombre}</label>
        <span>{investigador.nombresApellidos}</span>
      </div>
      <div className="info-row">
        <label>{messages.investigadores.infoRowLabels.dni}</label>
        <span>{investigador.dni}</span>
      </div>
      <div className="info-row">
        <label>{messages.investigadores.infoRowLabels.gradoAcademico}</label>
        <span>{investigador.grado}</span>
      </div>
      <div className="info-row highlight">
        <label>{messages.investigadores.infoRowLabels.proyectosAsignados}</label>
        <Badge>{investigador.cantidadProyectos}</Badge>
      </div>
    </div>
  </div>
);
