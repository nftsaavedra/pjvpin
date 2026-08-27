export {
  actualizarProyectoConParticipantes,
  buscarProyectosPorInvestigador,
  crearProyectoConParticipantes,
  eliminarProyecto,
  eliminarRelacionProyectoInvestigador,
  eliminarRelacionesProyecto,
  getAllProyectosDetalle,
  reactivarProyecto,
} from "@/shared/tauri/proyectos";

export { getTauriErrorMessage } from "@/shared/tauri/error";

export type {
  InvestigadorDetalle,
  EliminarProyectoResultado,
  Proyecto,
  ProyectoDetalle,
  ProyectoParticipanteResumen,
} from "@/shared/tauri/types";

export type { ProyectoParticipantesPayload } from "@/shared/tauri/proyectos";
