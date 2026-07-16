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
} from "@/shared/tauri/configuracion";

export { getTauriErrorMessage } from "@/shared/tauri/error";

export type {
  CatalogoItem,
  EliminarCatalogoResultado,
  GradoAcademico,
  Usuario,
} from "@/shared/tauri/types";
