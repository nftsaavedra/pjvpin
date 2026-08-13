use crate::grados::dto::{CreateGradoRequest, GradoAcademicoDoc, GradoAcademicoDto};
use crate::shared::error::AppError;

#[derive(Debug, Clone)]
pub struct GradoAcademico {
    pub id_grado: String,
    pub nombre: String,
    pub descripcion: Option<String>,
    /// FK suave al esquema `renati_level` (CONCYTEC/PeruCRIS).
    pub codigo_skos: Option<String>,
    pub activo: i64,
    pub created_at: i64,
    pub updated_at: Option<i64>,
}

impl GradoAcademico {
    pub fn new(id_grado: String, request: CreateGradoRequest) -> Result<Self, AppError> {
        if id_grado.trim().is_empty() {
            return Err(AppError::InternalError(
                "El id de grado no puede estar vacio.".to_string(),
            ));
        }
        if request.nombre.trim().is_empty() {
            return Err(AppError::InternalError(
                "El nombre del grado no puede estar vacio.".to_string(),
            ));
        }
        let codigo_skos = request
            .codigo_skos
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty());
        let now = crate::shared::time::now_ms();
        Ok(Self {
            id_grado,
            nombre: request.nombre,
            descripcion: request.descripcion,
            codigo_skos,
            activo: 1,
            created_at: now,
            updated_at: Some(now),
        })
    }
}

impl From<GradoAcademicoDoc> for GradoAcademico {
    fn from(doc: GradoAcademicoDoc) -> Self {
        Self {
            id_grado: doc.id_grado,
            nombre: doc.nombre,
            descripcion: doc.descripcion,
            codigo_skos: doc.codigo_skos,
            activo: doc.activo,
            created_at: doc.created_at,
            updated_at: doc.updated_at,
        }
    }
}

impl From<GradoAcademico> for GradoAcademicoDoc {
    fn from(m: GradoAcademico) -> Self {
        Self {
            id_grado: m.id_grado,
            nombre: m.nombre,
            descripcion: m.descripcion,
            codigo_skos: m.codigo_skos.clone(),
            activo: m.activo,
            created_at: m.created_at,
            updated_at: m.updated_at,
        }
    }
}

impl From<GradoAcademico> for GradoAcademicoDto {
    fn from(m: GradoAcademico) -> Self {
        Self {
            id_grado: m.id_grado,
            nombre: m.nombre,
            descripcion: m.descripcion,
            codigo_skos: m.codigo_skos,
            activo: m.activo,
            updated_at: m.updated_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn make_request(nombre: &str) -> CreateGradoRequest {
        CreateGradoRequest {
            nombre: nombre.to_string(),
            descripcion: Some("Descripcion".to_string()),
            codigo_skos: Some("doctor".to_string()),
        }
    }

    #[test]
    fn grado_new_acepta_datos_validos() {
        let grado = GradoAcademico::new("G001".to_string(), make_request("Doctor")).unwrap();
        assert_eq!(grado.id_grado, "G001");
        assert_eq!(grado.nombre, "Doctor");
        assert_eq!(grado.descripcion.as_deref(), Some("Descripcion"));
        assert_eq!(grado.activo, 1);
        assert!(grado.created_at > 0);
        assert!(grado.updated_at.is_some());
    }

    #[test]
    fn grado_new_rechaza_id_vacio() {
        let result = GradoAcademico::new("   ".to_string(), make_request("Doctor"));
        assert!(result.is_err(), "Debe rechazar id vacio");
    }

    #[test]
    fn grado_new_rechaza_nombre_vacio() {
        let result = GradoAcademico::new("G001".to_string(), make_request("   "));
        assert!(result.is_err(), "Debe rechazar nombre vacio");
    }

    #[test]
    fn grado_doc_roundtrip_conserva_campos() {
        let grado = GradoAcademico::new("G001".to_string(), make_request("Doctor")).unwrap();
        let doc: GradoAcademicoDoc = grado.clone().into();
        let restored: GradoAcademico = doc.into();
        assert_eq!(restored.id_grado, grado.id_grado);
        assert_eq!(restored.nombre, grado.nombre);
        assert_eq!(restored.descripcion, grado.descripcion);
        assert_eq!(restored.activo, grado.activo);
        assert_eq!(restored.created_at, grado.created_at);
        assert_eq!(restored.updated_at, grado.updated_at);
    }
}
