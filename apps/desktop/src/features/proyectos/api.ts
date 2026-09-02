export {
  actualizarProyectoConParticipantes,
  buscarProyectosPorInvestigador,
  crearProyectoConParticipantes,
  eliminarProyecto,
  eliminarRelacionProyectoInvestigador,
  eliminarRelacionesProyecto,
  getAllProyectosDetalle,
  reactivarProyecto,
} from "@/shared/api/proyectos";

export { getErrorMessage } from "@/shared/http/error";

export type {
  InvestigadorDetalle,
  EliminarProyectoResultado,
  Proyecto,
  ProyectoDetalle,
  ProyectoParticipanteResumen,
} from "@/shared/api/types";

export type { ProyectoParticipantesPayload } from "@/shared/api/proyectos";
