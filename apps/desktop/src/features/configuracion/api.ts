export {
  actualizarCatalogo,
  actualizarGrado,
  actualizarUsuario,
  consultarDniParaUsuario,
  consultarPersonaDeUsuario,
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
  type ActualizarUsuarioIdentidad,
  type CrearUsuarioArgs,
} from "@/shared/api/configuracion";

export { getErrorMessage } from "@/shared/http/error";

export type {
  CatalogoItem,
  EliminarCatalogoResultado,
  GradoAcademico,
  Persona,
  Usuario,
} from "@/shared/api/types";
