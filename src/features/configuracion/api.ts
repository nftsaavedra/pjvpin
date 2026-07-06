export {
  actualizarCatalogo,
  actualizarGrado,
  actualizarUsuario,
  consultarDniParaUsuario,
  crearCatalogo,
  crearGrado,
  crearUsuario,
  desactivarUsuario,
  eliminarCatalogo,
  eliminarGrado,
  getAllCatalogosAdmin,
  getAllGrados,
  getAllUsuarios,
  getCatalogos,
  reactivarCatalogo,
  reactivarGrado,
  reactivarUsuario,
  type CrearUsuarioArgs,
} from "@/services/tauri/configuracion";

export { getTauriErrorMessage } from "@/services/tauri/error";

export type {
  CatalogoItem,
  EliminarCatalogoResultado,
  GradoAcademico,
  Usuario,
} from "@/services/tauri/types";
