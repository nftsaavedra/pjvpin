//! Regression guard: confirma que los DTOs de `reportes` (reporte integral
//! de proyecto) se serializan correctamente a JSON wire.
//!
//! Estos DTOs son solo `Serialize` (salida IPC) — no requieren roundtrip.

use crate::reportes::dto::{
    EstadoDesglose, MonedaDesglose, ProyectoCabeceraReporte, ReporteProyectoIntegral,
    ResumenFinanciero,
};

#[test]
fn resumen_financiero_serializa_con_desglose() {
    let resumen = ResumenFinanciero {
        total_financiamientos: 5,
        desglose_por_moneda: vec![MonedaDesglose {
            moneda_codigo: "PEN".to_string(),
            moneda_nombre: "Sol".to_string(),
            cantidad: 3,
            monto_total: 30000.0,
        }],
        desglose_por_estado: vec![EstadoDesglose {
            estado_codigo: "aprobado".to_string(),
            estado_nombre: "Aprobado".to_string(),
            cantidad: 5,
        }],
    };
    let json = serde_json::to_string(&resumen).expect("serializar");
    assert!(json.contains("\"total_financiamientos\":5"));
    assert!(json.contains("\"moneda_codigo\":\"PEN\""));
    assert!(json.contains("\"estado_codigo\":\"aprobado\""));
}

#[test]
fn reporte_proyecto_integral_serializa_minimo() {
    let reporte = ReporteProyectoIntegral {
        cabecera: ProyectoCabeceraReporte {
            id_proyecto: "p-1".to_string(),
            titulo_proyecto: "Investigacion X".to_string(),
            activo: true,
            campo_ocde: Some("1203".to_string()),
            programas_relacionados: vec![],
            fecha_creacion: Some("2024-01-01".to_string()),
            fecha_actualizacion: Some("2024-12-01".to_string()),
        },
        equipo: vec![],
        total_investigadores: 0,
        patentes: vec![],
        total_patentes: 0,
        software_publicaciones: vec![],
        total_software: 0,
        equipamientos: vec![],
        total_equipamientos: 0,
        financiamientos: vec![],
        total_financiamientos: 0,
        resumen_financiero: ResumenFinanciero {
            total_financiamientos: 0,
            desglose_por_moneda: vec![],
            desglose_por_estado: vec![],
        },
    };
    let json = serde_json::to_string(&reporte).expect("serializar");
    assert!(json.contains("\"id_proyecto\":\"p-1\""));
    assert!(json.contains("\"titulo_proyecto\":\"Investigacion X\""));
    assert!(json.contains("\"total_investigadores\":0"));
}
