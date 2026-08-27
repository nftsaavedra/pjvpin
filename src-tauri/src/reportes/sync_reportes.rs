//! Reportes de sincronizacion persistidos (`sync_reportes`).
//!
//! Storage generico para los dos subsistemas de verificacion de doble via:
//!
//! - `SyncReportTipo::PureDiff` — diff read-only contra el portal Pure
//!   (`shared::external::pure_diff_service`).
//! - `SyncReportTipo::PeruCrisValidacion` — validacion contra la API publica
//!   de PeruCRIS (`shared::external::perucris_validation_service`).
//!
//! Antes de esta fase los reportes eran efimeros: se calculaban, se
//! mostraban en la UI y se perdian. Persistirlos permite (a) mostrar el
//! ultimo estado conocido sin re-ejecutar la consulta remota y (b) dejar
//! traza de cuando se verifico cada entidad.
//!
//! Patron DTO separado (igual que `investigadores::kardex`): `SyncReportDoc`
//! lleva `_id` y los nombres BSON snake_case; `SyncReport` es el contrato IPC
//! (camelCase) que cruza al frontend.

use futures_util::TryStreamExt;
use mongodb::bson::{doc, Document};
use mongodb::options::IndexOptions;
use mongodb::{Database, IndexModel};
use serde::{Deserialize, Serialize};

use crate::shared::error::AppError;

const COLLECTION_SYNC_REPORTES: &str = "sync_reportes";

/// Subsistema que genero el reporte.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum SyncReportTipo {
    PureDiff,
    PeruCrisValidacion,
}

impl SyncReportTipo {
    pub fn as_str(self) -> &'static str {
        match self {
            SyncReportTipo::PureDiff => "pure_diff",
            SyncReportTipo::PeruCrisValidacion => "perucris_validacion",
        }
    }

    /// Parsea el discriminante canonico. Usado por el command
    /// `list_sync_reports` para filtrar por tipo desde el frontend.
    pub fn parse(value: &str) -> Result<Self, AppError> {
        match value.trim() {
            "pure_diff" => Ok(SyncReportTipo::PureDiff),
            "perucris_validacion" => Ok(SyncReportTipo::PeruCrisValidacion),
            other => Err(AppError::ValidationError(format!(
                "Tipo de reporte de sincronizacion desconocido: '{other}'."
            ))),
        }
    }
}

/// Clasificacion de una entidad divergente entre la fuente local y la
/// remota. Las entidades que coinciden exactamente NO generan item.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ItemClasificacion {
    /// Existe en PJVPI y no en la fuente remota.
    SoloLocal,
    /// Existe en la fuente remota y no en PJVPI.
    SoloPure,
    /// Existe en ambas pero algun campo comparado difiere.
    Diferente,
}

/// Contadores agregados del reporte.
///
/// `total` es el universo evaluado (union de entidades locales y remotas);
/// los tres contadores restantes son subconjuntos de `items` (las entidades
/// sincronizadas no aparecen en ninguno).
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReportResumen {
    pub total: usize,
    pub solo_local: usize,
    pub solo_pure: usize,
    pub diferentes: usize,
    pub tiempo_total_ms: i64,
}

/// Entidad divergente detectada por la verificacion.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReportItem {
    /// `id_publicacion` / `id_investigador` / `entity_id` CERIF.
    pub id_local: Option<String>,
    /// `pure_uuid` / `pure_person_id` / `perucris_uuid`.
    pub id_pure: Option<String>,
    pub doi: Option<String>,
    pub titulo: Option<String>,
    pub anio: Option<i32>,
    pub clasificacion: ItemClasificacion,
    /// Campos con divergencia (`["titulo", "anio", ...]`) o mensajes de
    /// diagnostico del validador remoto.
    pub diferencias: Vec<String>,
    /// `true` cuando el item esta listo para publicarse en la fuente remota
    /// cuando el push se habilite (fase futura). Nunca implica escritura.
    pub adoptable: bool,
}

/// Reporte persistido de una verificacion de doble via.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncReport {
    pub id: String,
    pub tipo: SyncReportTipo,
    pub ejecutado_at: i64,
    pub resumen: SyncReportResumen,
    pub items: Vec<SyncReportItem>,
}

/// Calcula el resumen a partir de los items divergentes.
/// `total` (universo evaluado) y `tiempo_total_ms` los aporta el caller
/// porque dependen del pull completo, no solo de las divergencias.
pub fn build_resumen(
    items: &[SyncReportItem],
    total: usize,
    tiempo_total_ms: i64,
) -> SyncReportResumen {
    let contar = |c: ItemClasificacion| items.iter().filter(|i| i.clasificacion == c).count();
    SyncReportResumen {
        total,
        solo_local: contar(ItemClasificacion::SoloLocal),
        solo_pure: contar(ItemClasificacion::SoloPure),
        diferentes: contar(ItemClasificacion::Diferente),
        tiempo_total_ms,
    }
}

// =====================================================================
// Persistencia MongoDB (coleccion `sync_reportes`)
// =====================================================================

/// DTO canonico (BSON). `_id` y campos snake_case como el resto de las
/// colecciones del proyecto.
#[derive(Debug, Clone, Serialize, Deserialize)]
struct SyncReportDoc {
    #[serde(rename = "_id")]
    id: String,
    tipo: String,
    ejecutado_at: i64,
    resumen: SyncReportResumen,
    items: Vec<SyncReportItem>,
}

impl From<&SyncReport> for SyncReportDoc {
    fn from(r: &SyncReport) -> Self {
        Self {
            id: r.id.clone(),
            tipo: r.tipo.as_str().to_string(),
            ejecutado_at: r.ejecutado_at,
            resumen: r.resumen.clone(),
            items: r.items.clone(),
        }
    }
}

impl TryFrom<SyncReportDoc> for SyncReport {
    type Error = AppError;
    fn try_from(d: SyncReportDoc) -> Result<Self, Self::Error> {
        Ok(SyncReport {
            tipo: SyncReportTipo::parse(&d.tipo)?,
            id: d.id,
            ejecutado_at: d.ejecutado_at,
            resumen: d.resumen,
            items: d.items,
        })
    }
}

fn report_to_doc(report: &SyncReport) -> Result<Document, AppError> {
    let dto: SyncReportDoc = report.into();
    mongodb::bson::to_document(&dto).map_err(|e| {
        AppError::InternalError(format!("No se pudo serializar SyncReport a BSON: {e}"))
    })
}

fn doc_to_report(doc: Document) -> Result<SyncReport, AppError> {
    let dto: SyncReportDoc = mongodb::bson::from_document(doc).map_err(|e| {
        AppError::InternalError(format!(
            "No se pudo deserializar SyncReport desde BSON: {e}"
        ))
    })?;
    SyncReport::try_from(dto)
}

/// Indice compuesto `{tipo: 1, ejecutado_at: -1}`: historial por subsistema
/// con los mas recientes primero (consulta principal del panel).
pub async fn ensure_indexes(db: &Database) -> Result<(), AppError> {
    let index = IndexModel::builder()
        .keys(doc! { "tipo": 1, "ejecutado_at": -1 })
        .options(Some(IndexOptions::builder().build()))
        .build();
    db.collection::<Document>(COLLECTION_SYNC_REPORTES)
        .create_index(index)
        .await?;
    Ok(())
}

/// Inserta un reporte. Asigna `id` con un UUID v4 si llega vacio y devuelve
/// el reporte con el id ya resuelto.
pub async fn insert(db: &Database, report: SyncReport) -> Result<SyncReport, AppError> {
    let mut owned = report;
    if owned.id.trim().is_empty() {
        owned.id = uuid::Uuid::new_v4().to_string();
    }
    let doc = report_to_doc(&owned)?;
    db.collection::<Document>(COLLECTION_SYNC_REPORTES)
        .insert_one(doc)
        .await?;
    Ok(owned)
}

/// Lista los reportes mas recientes, opcionalmente filtrados por tipo.
pub async fn list_recent(
    db: &Database,
    tipo: Option<SyncReportTipo>,
    limit: i64,
) -> Result<Vec<SyncReport>, AppError> {
    let filter = match tipo {
        Some(t) => doc! { "tipo": t.as_str() },
        None => doc! {},
    };
    let cursor = db
        .collection::<Document>(COLLECTION_SYNC_REPORTES)
        .find(filter)
        .sort(doc! { "ejecutado_at": -1 })
        .limit(limit)
        .await?;
    let docs: Vec<Document> = cursor.try_collect().await?;
    docs.into_iter().map(doc_to_report).collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn item(clasificacion: ItemClasificacion) -> SyncReportItem {
        SyncReportItem {
            id_local: Some("pub-1".to_string()),
            id_pure: Some("pure-uuid-1".to_string()),
            doi: Some("10.1000/x".to_string()),
            titulo: Some("Titulo".to_string()),
            anio: Some(2024),
            clasificacion,
            diferencias: vec!["titulo".to_string()],
            adoptable: false,
        }
    }

    #[test]
    fn tipo_as_str_y_parse_son_inversos() {
        for t in [SyncReportTipo::PureDiff, SyncReportTipo::PeruCrisValidacion] {
            assert_eq!(SyncReportTipo::parse(t.as_str()).unwrap(), t);
        }
        assert!(SyncReportTipo::parse("otro").is_err());
    }

    #[test]
    fn map_resumen_contadores_correctos() {
        let items = vec![
            item(ItemClasificacion::SoloLocal),
            item(ItemClasificacion::SoloLocal),
            item(ItemClasificacion::SoloPure),
            item(ItemClasificacion::Diferente),
        ];
        let resumen = build_resumen(&items, 10, 1500);
        assert_eq!(resumen.total, 10);
        assert_eq!(resumen.solo_local, 2);
        assert_eq!(resumen.solo_pure, 1);
        assert_eq!(resumen.diferentes, 1);
        assert_eq!(resumen.tiempo_total_ms, 1500);
    }

    #[test]
    fn report_roundtrip_bson_preserva_campos() {
        let original = SyncReport {
            id: "rep-1".to_string(),
            tipo: SyncReportTipo::PureDiff,
            ejecutado_at: 1_700_000_000_000,
            resumen: build_resumen(&[item(ItemClasificacion::Diferente)], 5, 42),
            items: vec![item(ItemClasificacion::Diferente)],
        };
        let doc = report_to_doc(&original).expect("serializa a BSON");
        assert_eq!(doc.get_str("_id").unwrap(), "rep-1");
        assert_eq!(doc.get_str("tipo").unwrap(), "pure_diff");
        let parsed = doc_to_report(doc).expect("deserializa desde BSON");
        assert_eq!(parsed.id, original.id);
        assert_eq!(parsed.tipo, original.tipo);
        assert_eq!(parsed.ejecutado_at, original.ejecutado_at);
        assert_eq!(parsed.resumen.diferentes, 1);
        assert_eq!(parsed.items.len(), 1);
        assert_eq!(parsed.items[0].clasificacion, ItemClasificacion::Diferente);
        assert_eq!(parsed.items[0].id_pure.as_deref(), Some("pure-uuid-1"));
    }
}
