//! Handlers de la feature `geo`.
//!
//! Capa de aplicacion: recibe peticion del command, valida permisos via
//! `rbac`, delega al repository y devuelve DTOs.

use crate::geo::dto::UbigeoDto;
use crate::geo::repository;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

pub async fn obtener_ubigeos(
    state: &AppState,
    window_label: &str,
) -> Result<Vec<UbigeoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GeoRead).await?;
    repository::obtener_ubigeos(state.mongo_db()?).await
}

pub async fn obtener_ubigeos_por_departamento(
    state: &AppState,
    window_label: &str,
    departamento: &str,
) -> Result<Vec<UbigeoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GeoRead).await?;
    repository::find_by_departamento(state.mongo_db()?, departamento).await
}

pub async fn buscar_ubigeos(
    state: &AppState,
    window_label: &str,
    prefix: &str,
) -> Result<Vec<UbigeoDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::GeoRead).await?;
    repository::search_prefix(state.mongo_db()?, prefix).await
}
