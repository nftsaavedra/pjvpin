import { History } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Badge } from "@/shared/ui/Badge";
import { EmptyState } from "@/shared/ui/EmptyState";
import { messages } from "@/shared/feedback/messages";
import { esCambioKardexClasificatorio } from "@/shared/utils/investigadorUtils";
import type { CambioKardex } from "../../api";

interface InvestigadorDetailKardexSectionProps {
  cambios: CambioKardex[];
}

export const InvestigadorDetailKardexSection: React.FC<InvestigadorDetailKardexSectionProps> = ({
  cambios,
}) => (
  <div className="screen-section">
    <div className="renacyt-detail-card">
      <span className="renacyt-detail-toggle-copy">
        <span className="title-with-icon renacyt-detail-title">
          <AppIcon icon={History} size={18} />
          <span>{messages.investigadores.kardex.titulo}</span>
        </span>
        {cambios.length > 0 && <Badge variant="info">{cambios.length}</Badge>}
      </span>
      {cambios.length === 0 ? (
        <EmptyState variant="empty" message={messages.investigadores.kardex.sinCambios} />
      ) : (
        <ul className="flex flex-col gap-2 m-0 p-0 list-none">
          {cambios.map((cambio, index) => {
            const clasificatorio = esCambioKardexClasificatorio(cambio.campo);
            const linea = messages.investigadores.kardex.cambioLinea(
              cambio.campo,
              cambio.valorAnterior,
              cambio.valorNuevo,
            );
            const itemKey = `${cambio.campo}-${index}`;
            return (
              <li key={itemKey} className="flex items-center gap-2 text-sm text-gray-800">
                {clasificatorio ? <Badge variant="warning">{linea}</Badge> : <span>{linea}</span>}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  </div>
);
