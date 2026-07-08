export {
  actualizarProyectoConParticipantes,
  buscarProyectosPorInvestigador,
  crearProyectoConParticipantes,
  eliminarProyecto,
  eliminarRelacionProyectoInvestigador,
  eliminarRelacionesProyecto,
  getAllProyectosDetalle,
  reactivarProyecto,
} from "@/services/tauri/proyectos";

export { getTauriErrorMessage } from "@/services/tauri/error";

export type {
  InvestigadorDetalle,
  EliminarProyectoResultado,
  Proyecto,
  ProyectoDetalle,
  ProyectoParticipanteResumen,
} from "@/services/tauri/types";

export type { ProyectoParticipantesPayload } from "@/services/tauri/proyectos";
