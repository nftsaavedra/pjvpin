use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, IndexOptions},
    Client, Database, IndexModel,
};

use crate::shared::config::DatabaseConfig;
use crate::shared::error::AppError;

/// Colecciones reestructuradas en el alineamiento CONCYTEC/PeruCRIS (D10).
/// Usadas por el reset dev (`PJVPIN_RESET_DEV`): se dropean y re-seedan.
pub const DEV_RESET_COLLECTIONS: &[&str] = &[
    "catalogos",
    "ubigeos",
    "org_units",
    "entity_ocde_fields",
    "financiamientos",
    "proyectos",
    "participaciones",
    "publicaciones_cientificas",
    "patentes",
    "equipamientos",
    "proyecto_organizaciones",
    "proyecto_financiamientos",
    "patente_inventores",
    "patente_titulares",
    "publicacion_autores",
    "renacyt_kardex",
];

/// Drop best-effort de las colecciones dev reestructuradas (D10). Ignora
/// colecciones inexistentes. Solo debe invocarse en entorno de desarrollo.
pub async fn drop_dev_collections(db: &Database) -> Result<(), AppError> {
    for coll in DEV_RESET_COLLECTIONS {
        let _ = db.collection::<Document>(coll).drop().await;
    }
    Ok(())
}

pub async fn init_mongo(config: &DatabaseConfig) -> Result<Database, AppError> {
    let uri = config.mongodb_uri.as_deref().ok_or_else(|| {
        AppError::ConfigurationError(
            "Falta configurar PJVPIN_MONGODB_URI para usar MongoDB.".to_string(),
        )
    })?;

    let mut client_options = ClientOptions::parse(uri).await?;
    client_options.max_pool_size = Some(config.mongodb_max_pool_size);
    client_options.min_pool_size = Some(config.mongodb_min_pool_size);
    client_options.app_name = Some("PJVPI".to_string());

    let client = Client::with_options(client_options)?;
    let database = client.database(&config.mongodb_db_name);
    ensure_indexes(&database).await?;
    Ok(database)
}

pub async fn ensure_indexes(db: &Database) -> Result<(), AppError> {
    // Cada bloque por coleccion dropea primero TODOS los indices non-_id
    // (best-effort) y luego los recrea. Asi el setup hook es idempotente
    // frente a cualquier combinacion de upgrades donde un spec cambio.
    let _ = db.collection::<Document>("grados").drop_indexes().await;
    db.collection::<Document>("grados")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_grado": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("grados")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "nombre": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;

    let _ = db
        .collection::<Document>("investigadores")
        .drop_indexes()
        .await;
    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_investigador": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    // `investigadores.dni` ya no existe: el DNI vive en `personas`. El lookup
    // canonico es `personas.find_by_dni` + `investigadores.find({ persona_id })`.
    // Migracion: en despliegues previos, el indice `dni_1` queda vacio y debe
    // eliminarse manualmente con `db.investigadores.dropIndex("dni_1")`.
    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "persona_id": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "renacyt_id_investigador": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "renacyt_codigo_registro": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "renacyt_codigo_registro": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;
    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "renacyt_orcid": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "renacyt_orcid": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;

    let _ = db.collection::<Document>("proyectos").drop_indexes().await;
    db.collection::<Document>("proyectos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_proyecto": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("proyectos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "codigo": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "codigo": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;

    let _ = db
        .collection::<Document>("participaciones")
        .drop_indexes()
        .await;
    db.collection::<Document>("participaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_proyecto": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("participaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_investigador": 1 })
                .build(),
        )
        .await?;
    // Fase N2-B: UNIQUE (id_proyecto, id_investigador) en `participaciones`
    // (project_members). Evita duplicados del mismo investigador en un proyecto.
    db.collection::<Document>("participaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_proyecto": 1, "id_investigador": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;

    // Fase N2-C: pivot `proyecto_organizaciones` (project_organizations).
    // UNIQUE (id_proyecto, id_org_unit, rol): la misma org_unit puede aparecer
    // varias veces en el mismo proyecto con roles distintos.
    let _ = db
        .collection::<Document>("proyecto_organizaciones")
        .drop_indexes()
        .await;
    db.collection::<Document>("proyecto_organizaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_proyecto": 1, "id_org_unit": 1, "rol": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("proyecto_organizaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_org_unit": 1 })
                .build(),
        )
        .await?;

    // Fase N2-C: pivot `proyecto_financiamientos` (project_fundings).
    // UNIQUE (id_proyecto, id_financiamiento): un mismo fondo no se asigna dos
    // veces al mismo proyecto.
    let _ = db
        .collection::<Document>("proyecto_financiamientos")
        .drop_indexes()
        .await;
    db.collection::<Document>("proyecto_financiamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_proyecto": 1, "id_financiamiento": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("proyecto_financiamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_financiamiento": 1 })
                .build(),
        )
        .await?;

    // Fase N2-D: pivot polimorfico `entity_ocde_fields` (feature `ocde`).
    // UNIQUE (entity_type, entity_id, ocde_codigo): una entidad puede tener
    // varios codigos FORD, pero no duplicados.
    let _ = db
        .collection::<Document>("entity_ocde_fields")
        .drop_indexes()
        .await;
    db.collection::<Document>("entity_ocde_fields")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "entity_type": 1, "entity_id": 1, "ocde_codigo": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("entity_ocde_fields")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "entity_type": 1, "entity_id": 1 })
                .build(),
        )
        .await?;

    // Fase N3-A: pivot `patente_inventores` (patent_inventors).
    // UNIQUE (id_patente, id_persona): una persona no se repite como inventora
    // en la misma patente.
    let _ = db
        .collection::<Document>("patente_inventores")
        .drop_indexes()
        .await;
    db.collection::<Document>("patente_inventores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_patente": 1, "id_persona": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("patente_inventores")
        .create_index(IndexModel::builder().keys(doc! { "id_persona": 1 }).build())
        .await?;

    // Fase N3-A: pivot `patente_titulares` (patent_holders).
    // UNIQUE por (id_patente, holder_type, id_(org_unit|persona)). MongoDB
    // acepta UNIQUE parciales: el campo polimorfico es whichever este
    // presente; los duplicados se controlan a nivel aplicacion via
    // `validate_titular_uniqueness`.
    //
    // Decision: NO migrar a partial_filter_expression aunque `id_org_unit` /
    // `id_persona` sean Option<String>. El pivote es polimorfico por
    // `holder_type` (organizacion vs persona), y la unicidad se enforces en
    // capa aplicacion antes de tocar la BD. Migrar el indice aqui haria que
    // dos titulares-persona de la misma patente (con id_org_unit ausente
    // ambos) colisionaran por el lado del indice, no por la validacion.
    let _ = db
        .collection::<Document>("patente_titulares")
        .drop_indexes()
        .await;
    db.collection::<Document>("patente_titulares")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_patente": 1, "holder_type": 1, "id_org_unit": 1 })
                .options(Some(
                    IndexOptions::builder().unique(true).sparse(true).build(),
                ))
                .build(),
        )
        .await?;
    db.collection::<Document>("patente_titulares")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_patente": 1, "holder_type": 1, "id_persona": 1 })
                .options(Some(
                    IndexOptions::builder().unique(true).sparse(true).build(),
                ))
                .build(),
        )
        .await?;

    // Fase N3-B: pivot `publicacion_autores` (publication_authors).
    // UNIQUE (id_publicacion, id_persona): una persona no se repite como
    // autora de la misma publicacion.
    let _ = db
        .collection::<Document>("publicacion_autores")
        .drop_indexes()
        .await;
    db.collection::<Document>("publicacion_autores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_publicacion": 1, "id_persona": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("publicacion_autores")
        .create_index(IndexModel::builder().keys(doc! { "id_persona": 1 }).build())
        .await?;
    db.collection::<Document>("publicacion_autores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_org_unit_afiliacion": 1 })
                .build(),
        )
        .await?;

    let _ = db.collection::<Document>("usuarios").drop_indexes().await;
    db.collection::<Document>("usuarios")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_usuario": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("usuarios")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "username": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;

    // --- Patentes ---
    let _ = db.collection::<Document>("patentes").drop_indexes().await;
    db.collection::<Document>("patentes")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;
    // F3/D10: el campo `investigador_id` fue removido de Patente; los
    // inventores viven en el pivot `patente_inventores` (indices en su propio
    // ensure_indexes via macro).
    // Fase N2-G: UNIQUE sparse sobre `numero_patente`. Sparse para tolerar
    // patentes en tramite sin numero asignado.
    db.collection::<Document>("patentes")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "numero_patente": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "numero_patente": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;

    // --- Equipamientos ---
    let _ = db
        .collection::<Document>("equipamientos")
        .drop_indexes()
        .await;
    db.collection::<Document>("equipamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;
    // Fase N2-E: UNIQUE sparse sobre `codigo_institucional`. Solo equipamiento
    // con codigo institucional provisto por el area de patrimonio es unico.
    db.collection::<Document>("equipamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "codigo_institucional": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "codigo_institucional": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;

    // --- Financiamientos ---
    let _ = db
        .collection::<Document>("financiamientos")
        .drop_indexes()
        .await;
    db.collection::<Document>("financiamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;

    // --- Fase N0-B: Ubigeo INEI ---
    let _ = db.collection::<Document>("ubigeos").drop_indexes().await;
    db.collection::<Document>("ubigeos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "codigo": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("ubigeos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "departamento": 1, "provincia": 1, "distrito": 1 })
                .build(),
        )
        .await?;

    // --- Grupos de investigación ---
    let _ = db
        .collection::<Document>("grupos_investigacion")
        .drop_indexes()
        .await;
    db.collection::<Document>("grupos_investigacion")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_grupo": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("grupos_investigacion")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "coordinador_id": 1 })
                .build(),
        )
        .await?;

    // --- Publicaciones Científicas ---
    let pub_coll = db.collection::<Document>("publicaciones_cientificas");
    // Idempotente: drop todos los indices non-_id y recrear (evita
    // IndexOptionsConflict en upgrades donde el spec cambio).
    let _ = pub_coll.drop_indexes().await;
    pub_coll
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_publicacion": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    pub_coll
        .create_index(IndexModel::builder().keys(doc! { "anio": 1 }).build())
        .await?;
    // Fase N2-F: UNIQUE sparse sobre `doi` (un articulo con DOI valido no
    // se duplica). Sparse para permitir publicaciones sin DOI.
    pub_coll
        .create_index(
            IndexModel::builder()
                .keys(doc! { "doi": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "doi": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;
    // Fase N2-F: UNIQUE sparse sobre `pure_uuid` (sincronizacion con Pure).
    pub_coll
        .create_index(
            IndexModel::builder()
                .keys(doc! { "pure_uuid": 1 })
                .options(Some(
                    IndexOptions::builder()
                        .unique(true)
                        .partial_filter_expression(doc! {
                            "pure_uuid": { "$type": "string" }
                        })
                        .build(),
                ))
                .build(),
        )
        .await?;

    // --- Eventos Academicos ---
    db.collection::<Document>("eventos_academicos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_evento": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("eventos_academicos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "participantes.investigador_id": 1 })
                .build(),
        )
        .await?;

    // --- Pivots M:N CONCYTEC/PeruCRIS (N2-C / N3-A / N3-B) ---
    // Indices UNIQUE por (padre, FK) + indice simple por padre para cascades.
    crate::proyectos::proyecto_organizaciones::repository::ensure_indexes(db).await?;
    crate::proyectos::proyecto_financiamientos::repository::ensure_indexes(db).await?;
    crate::recursos::patente_inventores::repository::ensure_indexes(db).await?;
    crate::recursos::patente_titulares::repository::ensure_indexes(db).await?;
    crate::publicaciones::autores::repository::ensure_indexes(db).await?;

    // --- Features CONCYTEC/PeruCRIS: indices UNIQUE propios ---
    // catalogos (tipo,codigo + esquema,codigo_skos), geo (codigo ubigeo),
    // ocde (entity_type,entity_id,ocde_codigo), org_units (ruc partial filter +
    // parent_id compuesto).
    crate::catalogos::repository::ensure_indexes(db).await?;
    crate::geo::repository::ensure_indexes(db).await?;
    crate::ocde::repository::ensure_indexes(db).await?;
    crate::org_units::repository::ensure_indexes(db).await?;

    // --- Kardex RENACYT: indice compuesto {investigador_id, fecha_evento:-1} ---
    crate::investigadores::kardex::ensure_indexes(db).await?;

    Ok(())
}
