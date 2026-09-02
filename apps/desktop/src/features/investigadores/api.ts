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
  getKardexInvestigador,
  getPlantillaInvestigadoresDefault,
  importarInvestigadores,
  marcarCambiosRenacytRevisados,
  refrescarFormacionAcademicaRenacytInvestigador,
  refrescarRenacytTodos,
  reactivarInvestigador,
  type KardexEntry,
} from "@/shared/api/investigadores";

export {
  actualizarEvento,
  crearEvento,
  eliminarEvento,
  getEventosByInvestigador,
  reactivarEvento,
} from "@/shared/api/eventos";

export { sincronizarPublicacionesPure, getPublicacionesInvestigador } from "@/shared/api/pure";

export { getTauriErrorMessage } from "@/shared/api/error";

export type {
  CambioKardex,
  ImportInvestigadoresResult,
  Investigador,
  InvestigadorDetalle,
  EliminarInvestigadorResultado,
  EventoAcademico,
  ParticipanteEvento,
  PublicacionCientifica,
  RefreshInvestigadorRenacytFormacionResultado,
  RefreshMasivoRenacytResultado,
  RenacytFormacionAcademicaResumen,
  RenacytLookupResult,
  ReniecDniLookupResult,
  SyncPublicacionesResult,
} from "@/shared/api/types";
