//! Seed de la institucion UNF (Universidad Nacional de Frontera) y sus
//! sub-unidades inmediatas.
//!
//! Origen canonico: la entidad publica de UNF en PeruCRIS
//! (https://www.perucris.pe/entities/orgunit/97674e53-90f5-4e9c-b9a9-1c2efa766bd5)
//! + reconocimiento en `D:\HERMES\pjvpin\recon\perucris\INFORME_RECON_PERUCRIS.md` §3.
//!
//! Patron: igual que `seed_catalogos` y `seed_grados_if_empty` — idempotente
//! (`if_empty`) + re-seed forzado (`reseed_unf`) usado en
//! `PJVPIN_RESET_DEV`.
//!
//! Las sub-unidades usan `tipo_dependencia: "vicerrectorado"` (codigo real del
//! vocabulario CONCYTEC `concytec_tipo_subunidad`) que es el equivalente
//! semantico a "Vicepresidencia" en la nomenclatura de PeruCRIS. Esto
//! mantiene la integridad referencial con el vocabulario sin introducir
//! codigos ad-hoc.

use mongodb::bson::doc;
use mongodb::Database;
use serde::Deserialize;

use crate::org_units::dto::CreateOrgUnitRequest;
use crate::shared::error::AppError;

const UNF_SEED_JSON: &str = include_str!("data/org_unit_unf.json");

#[derive(Debug, Deserialize)]
struct SeedOrgUnit {
    id_org_unit: String,
    nombre: String,
    #[serde(default)]
    legal_name: Option<String>,
    #[serde(default)]
    acronimo: Option<String>,
    #[serde(default)]
    web_site: Option<String>,
    #[serde(default)]
    direccion: Option<String>,
    #[serde(default)]
    pais: Option<String>,
    #[serde(default)]
    descripcion: Option<String>,
    #[serde(default)]
    ruc: Option<String>,
    #[serde(default)]
    ror_id: Option<String>,
    #[serde(default)]
    isni_id: Option<String>,
    #[serde(default)]
    rin_id: Option<String>,
    #[serde(default)]
    scopus_id: Option<String>,
    #[serde(default)]
    sector_institucional: Option<String>,
    #[serde(default)]
    sunedu_clasificacion: Option<String>,
    #[serde(default)]
    sunedu_estado: Option<String>,
    #[serde(default)]
    sunedu_resolucion: Option<String>,
    tipo_organizacion: String,
    #[serde(default)]
    tipo_dependencia: Option<String>,
    #[serde(default)]
    tipo_educacion_superior: Option<String>,
    #[serde(default)]
    ciiu_codigo: Option<String>,
    #[serde(default = "default_true")]
    es_publica: bool,
    #[serde(default)]
    parent_id: Option<String>,
    #[serde(default)]
    ubigeo_codigo: Option<String>,
    #[serde(default)]
    perucris_uuid: Option<String>,
    #[serde(default)]
    perucris_handle: Option<String>,
}

#[derive(Debug, Deserialize)]
struct SeedUnfConfig {
    unf_matrix: SeedOrgUnit,
    sub_units: Vec<SeedOrgUnit>,
}

fn default_true() -> bool {
    true
}

fn seed_org_to_request(s: SeedOrgUnit) -> CreateOrgUnitRequest {
    CreateOrgUnitRequest {
        nombre: s.nombre,
        ubigeo_codigo: s.ubigeo_codigo,
        ruc: s.ruc,
        ror_id: s.ror_id,
        isni_id: s.isni_id,
        scopus_id: s.scopus_id,
        sector_institucional: s.sector_institucional,
        tipo_organizacion: s.tipo_organizacion,
        tipo_dependencia: s.tipo_dependencia,
        tipo_educacion_superior: s.tipo_educacion_superior,
        ciiu_codigo: s.ciiu_codigo,
        es_publica: s.es_publica,
        parent_id: s.parent_id,
        legal_name: s.legal_name,
        acronimo: s.acronimo,
        web_site: s.web_site,
        direccion: s.direccion,
        pais: s.pais,
        descripcion: s.descripcion,
        rin_id: s.rin_id,
        sunedu_clasificacion: s.sunedu_clasificacion,
        sunedu_estado: s.sunedu_estado,
        sunedu_resolucion: s.sunedu_resolucion,
        perucris_uuid: s.perucris_uuid,
        perucris_handle: s.perucris_handle,
    }
}

/// Inserta la matriz UNF y sus sub-unidades si no existe ninguna
/// `org-unf`. Idempotente: si ya existe, skip.
/// El seed se considera aplicado si la matriz `org-unf` existe.
pub async fn seed_org_units_unf_if_empty(db: &Database) -> Result<(), AppError> {
    let count = db
        .collection::<mongodb::bson::Document>("org_units")
        .count_documents(doc! { "id_org_unit": "org-unf" })
        .await?;
    if count > 0 {
        tracing::debug!("UNF ya sembrada, skip seed (defensivo)");
        return Ok(());
    }
    reseed_unf(db).await
}

/// Borra UNF y sus sub-unidades, reinserta el set embebido.
/// Usado por `PJVPIN_RESET_DEV`.
pub async fn reseed_unf(db: &Database) -> Result<(), AppError> {
    let config: SeedUnfConfig = serde_json::from_str(UNF_SEED_JSON).map_err(|e| {
        AppError::InternalError(format!("No se pudo parsear org_unit_unf.json: {e}"))
    })?;

    // Borrar la matriz y sub-unidades (eliminacion fisica por simplicidad
    // del seed; en runtime se valida con `assert_not_referenced`).
    db.collection::<mongodb::bson::Document>("org_units")
        .delete_many(doc! {
            "$or": [
                { "id_org_unit": "org-unf" },
                { "parent_id": "org-unf" },
            ]
        })
        .await?;

    insert_seed(db, config.unf_matrix).await?;
    for sub in config.sub_units {
        insert_seed(db, sub).await?;
    }
    Ok(())
}

/// Construye el `OrgUnit` con el id canonico del seed y lo persiste via
/// `upsert_org_unit`. Evita la generacion de UUID aleatorio de
/// `create_org_unit` (que rompe la idempotencia del seed y dificulta la
/// referencia externa — e.g. `parent_id = "org-unf"` en sub-unidades).
async fn insert_seed(db: &Database, s: SeedOrgUnit) -> Result<(), AppError> {
    let id = s.id_org_unit.clone();
    let request = seed_org_to_request(s);
    let model = crate::org_units::models::OrgUnit::new(id, request)?;
    crate::org_units::repository::upsert_org_unit(db, &model).await?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn unf_matrix_tiene_identificadores_requeridos() {
        let config: SeedUnfConfig = serde_json::from_str(UNF_SEED_JSON).unwrap();
        let m = &config.unf_matrix;
        assert!(m.ruc.is_some() && m.ruc.as_deref() == Some("20526270364"));
        assert!(m.ror_id.is_some() && m.ror_id.as_deref() == Some("017bd4h68"));
        assert!(m.isni_id.is_some() && m.isni_id.as_deref() == Some("0000000460222967"));
        assert!(m.scopus_id.is_some() && m.scopus_id.as_deref() == Some("60189585"));
        assert!(
            m.perucris_uuid.is_some()
                && m.perucris_uuid.as_deref() == Some("97674e53-90f5-4e9c-b9a9-1c2efa766bd5")
        );
        assert!(
            m.perucris_handle.is_some() && m.perucris_handle.as_deref() == Some("123456789/53485")
        );
    }

    #[test]
    fn unf_sub_units_tienen_parent_y_uuid() {
        let config: SeedUnfConfig = serde_json::from_str(UNF_SEED_JSON).unwrap();
        assert_eq!(config.sub_units.len(), 2);
        for sub in &config.sub_units {
            assert_eq!(sub.parent_id.as_deref(), Some("org-unf"));
            assert_eq!(sub.tipo_dependencia.as_deref(), Some("vicerrectorado"));
            assert!(sub.perucris_uuid.is_some(), "sub-unit sin perucris_uuid");
            assert_eq!(sub.es_publica, true);
        }
        // UUIDs reales del PeruCRIS live page (recon §3.1).
        let uuids: Vec<&str> = config
            .sub_units
            .iter()
            .filter_map(|s| s.perucris_uuid.as_deref())
            .collect();
        assert!(uuids.contains(&"6f2406de-6f0a-4a0d-9467-415dbfe0fa07"));
        assert!(uuids.contains(&"d9aa00f8-b90f-43e2-84c5-6644e1754c6b"));
    }

    #[test]
    fn unf_nombre_y_legal_name_no_son_iguales() {
        let config: SeedUnfConfig = serde_json::from_str(UNF_SEED_JSON).unwrap();
        let m = &config.unf_matrix;
        assert_eq!(m.nombre, "Universidad Nacional de Frontera");
        assert_eq!(
            m.legal_name.as_deref(),
            Some("UNIVERSIDAD NACIONAL DE FRONTERA")
        );
        assert_ne!(m.nombre, m.legal_name.as_deref().unwrap_or(""));
    }
}
