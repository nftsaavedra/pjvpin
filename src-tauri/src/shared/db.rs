use mongodb::{
    bson::{doc, Document},
    options::{ClientOptions, IndexOptions},
    Client, Database, IndexModel,
};

use crate::shared::config::DatabaseConfig;
use crate::shared::error::AppError;

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

    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_investigador": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("investigadores")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "dni": 1 })
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
                .build(),
        )
        .await?;

    db.collection::<Document>("proyectos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_proyecto": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;

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

    // --- Publicaciones (Pure sync) ---
    db.collection::<Document>("publicaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "pure_uuid": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("publicaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "investigador_id": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("publicaciones")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;

    // --- Patentes ---
    db.collection::<Document>("patentes")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("patentes")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "investigador_id": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("patentes")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "numero_patente": 1 })
                .build(),
        )
        .await?;

    // --- Productos ---
    db.collection::<Document>("productos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("productos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "investigador_id": 1 })
                .build(),
        )
        .await?;

    // --- Equipamientos ---
    db.collection::<Document>("equipamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;

    // --- Financiamientos ---
    db.collection::<Document>("financiamientos")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "proyecto_id": 1 })
                .build(),
        )
        .await?;

    // --- Grupos de investigación ---
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
    db.collection::<Document>("publicaciones_cientificas")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "id_publicacion": 1 })
                .options(Some(IndexOptions::builder().unique(true).build()))
                .build(),
        )
        .await?;
    db.collection::<Document>("publicaciones_cientificas")
        .create_index(
            IndexModel::builder()
                .keys(doc! { "autores_ids": 1 })
                .build(),
        )
        .await?;
    db.collection::<Document>("publicaciones_cientificas")
        .create_index(IndexModel::builder().keys(doc! { "anio": 1 }).build())
        .await?;
    db.collection::<Document>("publicaciones_cientificas")
        .create_index(IndexModel::builder().keys(doc! { "doi": 1 }).build())
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

    Ok(())
}
