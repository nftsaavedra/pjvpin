export {
  buscarInvestigadorPorDni,
  buscarInvestigadorPorDniConRenacyt,
  consultarRenacytInvestigador,
  consultarDniReniec,
  crearInvestigador,
  descargarConstanciaRenacytInvestigador,
  eliminarInvestigador,
  getAllInvestigadores,
  getAllInvestigadoresConProyectos,
  refrescarFormacionAcademicaRenacytInvestigador,
  reactivarInvestigador,
} from "@/shared/tauri/investigadores";

export {
  actualizarEvento,
  crearEvento,
  eliminarEvento,
  getEventosByInvestigador,
  reactivarEvento,
} from "@/shared/tauri/eventos";

export { sincronizarPublicacionesPure, getPublicacionesInvestigador } from "@/shared/tauri/pure";

export { getTauriErrorMessage } from "@/shared/tauri/error";

export type {
  Investigador,
  InvestigadorDetalle,
  EliminarInvestigadorResultado,
  EventoAcademico,
  ParticipanteEvento,
  Publicacion,
  RefreshInvestigadorRenacytFormacionResultado,
  RenacytFormacionAcademicaResumen,
  RenacytLookupResult,
  ReniecDniLookupResult,
  SyncPublicacionesResult,
} from "@/shared/tauri/types";
