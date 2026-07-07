export {
  buscarInvestigadorPorDni,
  buscarInvestigadorPorDniConRenacyt,
  consultarRenacytInvestigador,
  consultarDniReniec,
  crearInvestigador,
  eliminarInvestigador,
  getAllInvestigadores,
  getAllInvestigadoresConProyectos,
  refrescarFormacionAcademicaRenacytInvestigador,
  reactivarInvestigador,
} from "@/services/tauri/investigadores";

export { sincronizarPublicacionesPure, getPublicacionesInvestigador } from "@/services/tauri/pure";

export { getTauriErrorMessage } from "@/services/tauri/error";

export type {
  Investigador,
  InvestigadorDetalle,
  EliminarInvestigadorResultado,
  Publicacion,
  RefreshInvestigadorRenacytFormacionResultado,
  RenacytFormacionAcademicaResumen,
  RenacytLookupResult,
  ReniecDniLookupResult,
  SyncPublicacionesResult,
} from "@/services/tauri/types";
