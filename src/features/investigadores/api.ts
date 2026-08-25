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
  getPlantillaInvestigadoresDefault,
  importarInvestigadores,
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
  ImportInvestigadoresResult,
  Investigador,
  InvestigadorDetalle,
  EliminarInvestigadorResultado,
  EventoAcademico,
  ParticipanteEvento,
  PublicacionCientifica,
  RefreshInvestigadorRenacytFormacionResultado,
  RenacytFormacionAcademicaResumen,
  RenacytLookupResult,
  ReniecDniLookupResult,
  SyncPublicacionesResult,
} from "@/shared/tauri/types";
