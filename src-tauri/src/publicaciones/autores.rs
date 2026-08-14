//! Pivot `publicacion_autores` (publication_authors).
//!
//! Resuelve la relacion M:N entre `publicaciones_cientificas` y `personas`
//! con un atributo `orden` (posicion del autor) y `es_autor_correspondiente`.
//! Adicionalmente, opcionalmente se puede asociar la `id_org_unit_afiliacion`
//! del autor en el momento de la publicacion.
//!
//! Las funciones de persistencia (CRUD) viven en el `repository.rs` de
//! `publicaciones` y se invocan en cascada desde los handlers de publicaciones.

use crate::shared::error::AppError;

#[derive(Debug, Clone, Default)]
pub struct PublicacionAutor {
    pub id: String,
    pub id_publicacion: String,
    pub id_persona: String,
    pub id_org_unit_afiliacion: Option<String>,
    pub orden: i32,
    pub es_autor_correspondiente: bool,
}

impl PublicacionAutor {
    /// Construye un registro. Reglas:
    /// - `id`, `id_publicacion`, `id_persona`: no vacios.
    /// - `orden`: >= 1.
    pub fn new(
        id: String,
        id_publicacion: String,
        id_persona: String,
        id_org_unit_afiliacion: Option<String>,
        orden: i32,
        es_autor_correspondiente: bool,
    ) -> Result<Self, AppError> {
        if id.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de publicacion_autor no puede estar vacio.".to_string(),
            ));
        }
        if id_publicacion.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_publicacion no puede estar vacio.".to_string(),
            ));
        }
        if id_persona.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id_persona no puede estar vacio.".to_string(),
            ));
        }
        if orden < 1 {
            return Err(AppError::InternalError(format!(
                "El orden del autor debe ser >= 1 (recibido: {orden})."
            )));
        }
        Ok(Self {
            id,
            id_publicacion: id_publicacion.trim().to_string(),
            id_persona: id_persona.trim().to_string(),
            id_org_unit_afiliacion: id_org_unit_afiliacion
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty()),
            orden,
            es_autor_correspondiente,
        })
    }
}

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize)]
pub struct PublicacionAutorDoc {
    #[serde(rename = "_id")]
    pub id: String,
    pub id_publicacion: String,
    pub id_persona: String,
    #[serde(default)]
    pub id_org_unit_afiliacion: Option<String>,
    pub orden: i32,
    #[serde(default)]
    pub es_autor_correspondiente: bool,
}

impl From<PublicacionAutor> for PublicacionAutorDoc {
    fn from(m: PublicacionAutor) -> Self {
        Self {
            id: m.id,
            id_publicacion: m.id_publicacion,
            id_persona: m.id_persona,
            id_org_unit_afiliacion: m.id_org_unit_afiliacion,
            orden: m.orden,
            es_autor_correspondiente: m.es_autor_correspondiente,
        }
    }
}

impl From<PublicacionAutorDoc> for PublicacionAutor {
    fn from(d: PublicacionAutorDoc) -> Self {
        Self {
            id: d.id,
            id_publicacion: d.id_publicacion,
            id_persona: d.id_persona,
            id_org_unit_afiliacion: d.id_org_unit_afiliacion,
            orden: d.orden,
            es_autor_correspondiente: d.es_autor_correspondiente,
        }
    }
}

pub mod repository {
    //! Persistencia del pivot `publicacion_autores`.
    //! Generada via macro `impl_pivot_repository!` (DRY, compartido en `shared::macros`).

    use super::{PublicacionAutor, PublicacionAutorDoc};

    crate::impl_pivot_repository!(
        PublicacionAutor,
        PublicacionAutorDoc,
        "publicacion_autores",
        id_publicacion,
        list_by_publicacion,
        delete_for_publicacion,
        &["id_publicacion", "id_persona"],
        "publicacion_autor"
    );
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_acepta_autor_valido() {
        let a = PublicacionAutor::new(
            "a-1".to_string(),
            "pub-1".to_string(),
            "persona-1".to_string(),
            None,
            1,
            false,
        )
        .unwrap();
        assert_eq!(a.orden, 1);
        assert!(!a.es_autor_correspondiente);
    }

    #[test]
    fn new_rechaza_orden_menor_a_1() {
        let r = PublicacionAutor::new(
            "a-1".to_string(),
            "pub-1".to_string(),
            "persona-1".to_string(),
            None,
            0,
            false,
        );
        assert!(r.is_err());
    }

    #[test]
    fn doc_round_trip() {
        let a = PublicacionAutor::new(
            "a-1".to_string(),
            "pub-1".to_string(),
            "persona-1".to_string(),
            Some("org-1".to_string()),
            2,
            true,
        )
        .unwrap();
        let doc: PublicacionAutorDoc = a.clone().into();
        let back: PublicacionAutor = doc.into();
        assert_eq!(back.id, a.id);
        assert_eq!(back.orden, a.orden);
    }
}
