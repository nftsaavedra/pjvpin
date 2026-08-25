//! Handlers de la feature `org_units`.
//!
//! Capa de aplicacion: valida permisos via `rbac`, delega al repository y
//! devuelve DTOs. El borrado aplica RESTRICT contra las colecciones pivote
//! (`proyecto_organizaciones`, `patente_titulares`, `entity_ocde_fields`,
//! `publicacion_autores` con `id_org_unit_afiliacion`).

use crate::org_units::dto::OrgUnitDto;
use crate::org_units::models::OrgUnit;
use crate::org_units::repository;
use crate::shared::error::AppError;
use crate::shared::rbac;
use crate::shared::state::AppState;

fn model_to_dto(m: OrgUnit) -> OrgUnitDto {
    OrgUnitDto {
        id_org_unit: m.id_org_unit,
        nombre: m.nombre,
        ubigeo_codigo: m.ubigeo_codigo,
        ruc: m.ruc,
        ror_id: m.ror_id,
        isni_id: m.isni_id,
        scopus_id: m.scopus_id,
        sector_institucional: m.sector_institucional,
        tipo_organizacion: m.tipo_organizacion,
        tipo_dependencia: m.tipo_dependencia,
        tipo_educacion_superior: m.tipo_educacion_superior,
        ciiu_codigo: m.ciiu_codigo,
        es_publica: m.es_publica,
        parent_id: m.parent_id,
        updated_at: m.updated_at,
        legal_name: m.legal_name,
        acronimo: m.acronimo,
        web_site: m.web_site,
        direccion: m.direccion,
        pais: m.pais,
        descripcion: m.descripcion,
        rin_id: m.rin_id,
        sunedu_clasificacion: m.sunedu_clasificacion,
        sunedu_estado: m.sunedu_estado,
        sunedu_resolucion: m.sunedu_resolucion,
        perucris_uuid: m.perucris_uuid,
        perucris_handle: m.perucris_handle,
    }
}

pub async fn crear_org_unit(
    state: &AppState,
    window_label: &str,
    request: crate::org_units::dto::CreateOrgUnitRequest,
) -> Result<OrgUnitDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::OrgUnitsManage).await?;
    let model = repository::create_org_unit(state.mongo_db()?, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "org_unit.create",
        "org_unit",
        &model.id_org_unit,
        format!("nombre: {}", model.nombre),
    );
    Ok(model_to_dto(model))
}

pub async fn actualizar_org_unit(
    state: &AppState,
    window_label: &str,
    id: &str,
    request: crate::org_units::dto::UpdateOrgUnitRequest,
) -> Result<OrgUnitDto, AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::OrgUnitsManage).await?;
    let model = repository::update_org_unit(state.mongo_db()?, id, request).await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "org_unit.update",
        "org_unit",
        &model.id_org_unit,
        format!("nombre: {}", model.nombre),
    );
    Ok(model_to_dto(model))
}

pub async fn obtener_org_unit(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<OrgUnitDto, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::OrgUnitsView).await?;
    let model = repository::get_org_unit(state.mongo_db()?, id).await?;
    Ok(model_to_dto(model))
}

pub async fn listar_org_units(
    state: &AppState,
    window_label: &str,
    parent_id: Option<String>,
) -> Result<Vec<OrgUnitDto>, AppError> {
    rbac::require_permission(state, window_label, rbac::AppPermission::OrgUnitsView).await?;
    repository::listar_org_units_por_padre(state.mongo_db()?, parent_id.as_deref()).await
}

pub async fn eliminar_org_unit(
    state: &AppState,
    window_label: &str,
    id: &str,
) -> Result<(), AppError> {
    let actor =
        rbac::require_permission(state, window_label, rbac::AppPermission::OrgUnitsManage).await?;
    if id.trim().is_empty() {
        return Err(AppError::InternalError(
            "Debe indicar el id de la unidad organizativa.".to_string(),
        ));
    }
    crate::shared::refs::assert_not_referenced(
        state.mongo_db()?,
        "org_units",
        id,
        &[
            ("proyecto_organizaciones", "id_org_unit"),
            ("patente_titulares", "id_org_unit"),
            ("publicacion_autores", "id_org_unit_afiliacion"),
        ],
    )
    .await?;
    state
        .mongo_db()?
        .collection::<mongodb::bson::Document>("org_units")
        .delete_one(mongodb::bson::doc! { "id_org_unit": id })
        .await?;
    crate::shared::audit::write_generic_audit(
        &actor,
        "org_unit.delete",
        "org_unit",
        id,
        "eliminacion fisica".to_string(),
    );
    Ok(())
}
