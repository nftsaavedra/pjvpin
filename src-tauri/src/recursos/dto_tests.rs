#[cfg(test)]
mod tests {
    use crate::recursos::dto::{
        CreateEquipamientoRequest, CreateFinanciamientoRequest, CreatePatenteRequest,
        CreateProductoRequest,
    };
    use serde_json::json;

    #[test]
    fn create_patente_request_acepta_camel_case() {
        let json = json!({
            "proyectoId": "P001",
            "investigadorId": "I001",
            "titulo": "Sistema X",
            "numeroPatente": "P2025-001",
            "estado": "En trámite",
            "fechaSolicitud": 1700000000i64,
            "fechaConcesion": null,
            "pais": "Perú",
            "entidadConcedente": "INDECOPI",
            "descripcion": "Patente de invención",
        });
        let req: CreatePatenteRequest = serde_json::from_value(json).expect("must parse");
        assert_eq!(req.proyecto_id.as_deref(), Some("P001"));
        assert_eq!(req.investigador_id.as_deref(), Some("I001"));
        assert_eq!(req.titulo, "Sistema X");
        assert_eq!(req.numero_patente.as_deref(), Some("P2025-001"));
        assert_eq!(req.estado.as_deref(), Some("En trámite"));
        assert_eq!(req.fecha_solicitud, Some(1700000000));
        assert_eq!(req.pais.as_deref(), Some("Perú"));
        assert_eq!(req.entidad_concedente.as_deref(), Some("INDECOPI"));
    }

    #[test]
    fn create_patente_request_no_acepta_snake_case() {
        // Sin #[serde(rename_all = "camelCase")] los campos snake_case se
        // mapearían a None. Con camelCase rename, snake_case debe ignorarse.
        let json = json!({
            "proyecto_id": "P001",
            "titulo": "Sistema X",
        });
        let req: CreatePatenteRequest = serde_json::from_value(json).expect("must parse");
        assert!(
            req.proyecto_id.is_none(),
            "proyecto_id en snake_case debe ser ignorado"
        );
        assert_eq!(req.titulo, "Sistema X");
    }

    #[test]
    fn create_producto_request_acepta_camel_case() {
        let json = json!({
            "proyectoId": "P001",
            "nombre": "Producto X",
            "tipo": "Software",
            "etapa": "MVP",
            "fechaRegistro": 1700000000i64,
        });
        let req: CreateProductoRequest = serde_json::from_value(json).expect("must parse");
        assert_eq!(req.nombre, "Producto X");
        assert_eq!(req.tipo.as_deref(), Some("Software"));
        assert_eq!(req.etapa.as_deref(), Some("MVP"));
        assert_eq!(req.fecha_registro, Some(1700000000));
    }

    #[test]
    fn create_equipamiento_request_acepta_camel_case() {
        let json = json!({
            "proyectoId": "P001",
            "nombre": "Equipo X",
            "valorEstimado": 12500.50,
            "moneda": "PEN",
            "fechaAdquisicion": 1700000000i64,
        });
        let req: CreateEquipamientoRequest = serde_json::from_value(json).expect("must parse");
        assert_eq!(req.nombre, "Equipo X");
        assert_eq!(req.valor_estimado, Some(12500.50));
        assert_eq!(req.moneda.as_deref(), Some("PEN"));
        assert_eq!(req.fecha_adquisicion, Some(1700000000));
    }

    #[test]
    fn create_financiamiento_request_acepta_camel_case() {
        let json = json!({
            "proyectoId": "P001",
            "entidadFinanciadora": "FONDECYT",
            "tipo": "Concurso",
            "monto": 50000.0,
            "moneda": "PEN",
            "estadoFinanciero": "Aprobado",
        });
        let req: CreateFinanciamientoRequest = serde_json::from_value(json).expect("must parse");
        assert_eq!(req.entidad_financiadora, "FONDECYT");
        assert_eq!(req.tipo.as_deref(), Some("Concurso"));
        assert_eq!(req.monto, Some(50000.0));
        assert_eq!(req.moneda.as_deref(), Some("PEN"));
        assert_eq!(req.estado_financiero.as_deref(), Some("Aprobado"));
    }
}
