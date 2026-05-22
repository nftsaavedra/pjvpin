/// Generates 8 CRUD repository functions for one resource entity type.
/// Delete is soft-delete (activo = 0). Reactivate restores (activo = 1).
#[macro_export]
macro_rules! impl_resource_repository {
    (
        $entity:ty,
        $create_req:ty,
        $update_req:ty,
        $collection:expr,
        $id_field:ident,
        $fn_create:ident,
        $fn_get_by_proj:ident,
        $fn_get_by_id:ident,
        $fn_update:ident,
        $fn_delete:ident,
        $fn_delete_by_proj:ident,
        $fn_reactivate:ident,
        $error_label:expr,
        $( $upd_field:ident ),* $(,)?
    ) => {
        pub async fn $fn_create(
            db: &mongodb::Database,
            request: $create_req,
        ) -> Result<$entity, $crate::shared::error::AppError> {
            let entity = <$entity>::new(request);
            db.collection::<$entity>($collection).insert_one(&entity).await?;
            Ok(entity)
        }

        pub async fn $fn_get_by_proj(
            db: &mongodb::Database,
            proyecto_id: &str,
        ) -> Result<Vec<$entity>, $crate::shared::error::AppError> {
            db.collection::<$entity>($collection)
                .find(mongodb::bson::doc! { "proyecto_id": proyecto_id, "activo": 1 })
                .await?
                .try_collect::<Vec<_>>()
                .await
                .map_err(Into::into)
        }

        pub async fn $fn_get_by_id(
            db: &mongodb::Database,
            $id_field: &str,
        ) -> Result<$entity, $crate::shared::error::AppError> {
            db.collection::<$entity>($collection)
                .find_one(mongodb::bson::doc! { stringify!($id_field): $id_field, "activo": 1 })
                .await?
                .ok_or_else(|| $crate::shared::error::AppError::NotFound($error_label.to_string()))
        }

        pub async fn $fn_update(
            db: &mongodb::Database,
            $id_field: &str,
            request: $update_req,
        ) -> Result<$entity, $crate::shared::error::AppError> {
            let now = $crate::shared::time::now_ms();
            let mut update = mongodb::bson::doc! { "updated_at": now };
            $(
                if let Some(v) = request.$upd_field {
                    update.insert(stringify!($upd_field), v);
                }
            )*
            db.collection::<mongodb::bson::Document>($collection)
                .update_one(
                    mongodb::bson::doc! { stringify!($id_field): $id_field },
                    mongodb::bson::doc! { "$set": update },
                )
                .await?;
            $fn_get_by_id(db, $id_field).await
        }

        pub async fn $fn_delete(
            db: &mongodb::Database,
            $id_field: &str,
        ) -> Result<(), $crate::shared::error::AppError> {
            db.collection::<mongodb::bson::Document>($collection)
                .update_one(
                    mongodb::bson::doc! { stringify!($id_field): $id_field },
                    mongodb::bson::doc! { "$set": { "activo": 0, "updated_at": $crate::shared::time::now_ms() } },
                )
                .await?;
            Ok(())
        }

        pub async fn $fn_delete_by_proj(
            db: &mongodb::Database,
            proyecto_id: &str,
        ) -> Result<(), $crate::shared::error::AppError> {
            db.collection::<mongodb::bson::Document>($collection)
                .update_many(
                    mongodb::bson::doc! { "proyecto_id": proyecto_id },
                    mongodb::bson::doc! { "$set": { "activo": 0, "updated_at": $crate::shared::time::now_ms() } },
                )
                .await?;
            Ok(())
        }

        pub async fn $fn_reactivate(
            db: &mongodb::Database,
            $id_field: &str,
        ) -> Result<$entity, $crate::shared::error::AppError> {
            db.collection::<mongodb::bson::Document>($collection)
                .update_one(
                    mongodb::bson::doc! { stringify!($id_field): $id_field },
                    mongodb::bson::doc! { "$set": { "activo": 1, "updated_at": $crate::shared::time::now_ms() } },
                )
                .await?;
            db.collection::<$entity>($collection)
                .find_one(mongodb::bson::doc! { stringify!($id_field): $id_field })
                .await?
                .ok_or_else(|| $crate::shared::error::AppError::NotFound($error_label.to_string()))
        }
    };
}
