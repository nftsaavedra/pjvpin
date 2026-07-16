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
} from "@/shared/tauri/investigadores";

export { sincronizarPublicacionesPure, getPublicacionesInvestigador } from "@/shared/tauri/pure";

export { getTauriErrorMessage } from "@/shared/tauri/error";

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
} from "@/shared/tauri/types";
