//! Seed de los 15 vocabularios controlados CONCYTEC (SKOS).
//!
//! Origen canonico: <https://conocimiento.concytec.gob.pe/vocabularios/>
//! (XLSX / SKOS-XML). En esta version se carga un subconjunto representativo
//! embebido en codigo para validar el contrato de FK y los tests. La
//! importacion completa desde los XLSX oficiales queda como TODO para una
//! fase siguiente (con `calamine` o `quick-xml`).
//!
//! Convenciones:
//! - `tipo = esquema` para cada item (asi el filtro por `tipo` del codigo
//!   existente reutiliza la UI legacy).
//! - `codigo_skos` = notation oficial del SKOS (puede ser igual al `codigo`
//!   interno si coincide, p.ej. `tipo_organizacion`/`Universidad`).
//! - `padre_codigo` referencia dentro del mismo esquema (jerarquia OCDE FORD).
//! - `editable = 0` para vocablos oficiales CONCYTEC; editable=1 para
//!   catalogos internos.
//!
//! Cobertura D11 (Gap analysis):
//! 1. ocde_ford (FORD)                  -- Top-level + subcampos relevantes
//! 2. ocde_tipo_ocupacion (Frascati)    -- Personal I+D (subset)
//! 3. ocde_sector_institucional         -- Sectores (subset)
//! 4. ocde_naturaleza_institucion       -- Publica / Privada
//! 5. ocde_tipo_proyecto (Oslo/Frascati)-- Tipos de actividad
//! 6. sunedu_tipo_institucion           -- Tipos de IES
//! 7. renati_level                      -- Grados (alias a `grados`)
//! 8. renati_type                       -- Tipos de trabajo investigacion
//! 9. concytec_tipo_subunidad           -- Sub-unidades
//! 10. concytec_estado_proyecto         -- Estado CONCYTEC
//! 11. concytec_equipamiento            -- Tipos de equipamiento
//! 12. concytec_uso_equipamiento        -- Usos
//! 13. concytec_terminos                -- Genero, ambito geografico, etc.
//! 14. minam_tematicas_ambientales      -- Tematicas ambientales
//! 15. ins_tematicas_salud              -- Tematicas salud
//!
//! Version de los vocabularios CONCYTEC embebidos:
//! `VOCAB_CONCYTEC_VERSION`. Ajustar al reimportar.

use mongodb::bson::doc;
use mongodb::Database;

use crate::catalogos::dto::CreateCatalogoRequest;
use crate::catalogos::repository;
use crate::shared::error::AppError;

/// Version de los vocabularios embebidos. Reimportar y bumpear al actualizar
/// desde <https://conocimiento.concytec.gob.pe/vocabularios/>.
pub use crate::shared::defaults::VOCAB_CONCYTEC_VERSION;

/// Filas del seed. Cada tupla = (esquema, codigo_skos, codigo_interno, nombre,
/// padre_codigo, nivel).
fn seed_entries() -> Vec<SeedEntry> {
    vec![
        // 1. OCDE FORD -- Campos de investigacion (jerarquia 3 niveles)
        SeedEntry::new(
            "ocde_ford",
            "1",
            "ciencias_naturales",
            "Ciencias Naturales",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.1",
            "matematicas",
            "Matematicas",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.2",
            "ciencias_computacion",
            "Ciencias de la Computacion e Informatica",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.3",
            "ciencias_fisicas",
            "Ciencias Fisicas",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.4",
            "ciencias_quimicas",
            "Ciencias Quimicas",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.5",
            "ciencias_tierra",
            "Ciencias de la Tierra y del Medio Ambiente",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.6",
            "ciencias_biologicas",
            "Ciencias Biologicas",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "1.7",
            "otras_naturales",
            "Otras Ciencias Naturales",
            Some("1"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2",
            "ingenierias_tecnologias",
            "Ingenierias y Tecnologias",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.1",
            "ing_civil",
            "Ingenieria Civil",
            Some("2"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.2",
            "ing_electrica_electronica",
            "Ingenieria Electrica, Electronica e Informatica",
            Some("2"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.3",
            "ing_mecanica",
            "Ingenieria Mecanica",
            Some("2"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.4",
            "ing_quimica",
            "Ingenieria Quimica",
            Some("2"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.5",
            "ing_materiales",
            "Ingenieria de los Materiales",
            Some("2"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.10",
            "ing_medioambiente",
            "Ingenieria del Medio Ambiente",
            Some("2"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "2.10.02",
            "ing_ambiental",
            "Ingenieria Ambiental",
            Some("2.10"),
            3,
        ),
        SeedEntry::new(
            "ocde_ford",
            "3",
            "ciencias_medicas_salud",
            "Ciencias Medicas y de la Salud",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_ford",
            "3.1",
            "medicina_basica",
            "Medicina Basica",
            Some("3"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "3.2",
            "medicina_clinica",
            "Medicina Clinica",
            Some("3"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "3.3",
            "ciencias_salud",
            "Ciencias de la Salud",
            Some("3"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "4",
            "ciencias_agricolas",
            "Ciencias Agricolas",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_ford",
            "5",
            "ciencias_sociales",
            "Ciencias Sociales",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_ford",
            "5.2",
            "economia",
            "Economia y Negocios",
            Some("5"),
            2,
        ),
        SeedEntry::new(
            "ocde_ford",
            "5.3",
            "ciencias_educacion",
            "Ciencias de la Educacion",
            Some("5"),
            2,
        ),
        SeedEntry::new("ocde_ford", "6", "humanidades", "Humanidades", None, 1),
        // 2. OCDE tipo_ocupacion (Frascati) - Personal I+D
        SeedEntry::new(
            "ocde_tipo_ocupacion",
            "investigadores",
            "investigadores",
            "Investigadores",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_tipo_ocupacion",
            "tecnicos",
            "tecnicos",
            "Tecnicos y personal asimilado",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_tipo_ocupacion",
            "apoyo",
            "apoyo",
            "Personal de apoyo",
            None,
            1,
        ),
        // 3. OCDE sector_institucional
        SeedEntry::new(
            "ocde_sector_institucional",
            "gobierno",
            "gobierno",
            "Gobierno",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_sector_institucional",
            "educacion_superior",
            "educacion_superior",
            "Ensenanza Superior",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_sector_institucional",
            "empresas",
            "empresas",
            "Empresas",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_sector_institucional",
            "privado_sin_fines",
            "privado_sin_fines",
            "Organizaciones privadas sin fines de lucro",
            None,
            1,
        ),
        // 4. OCDE naturaleza_institucion
        SeedEntry::new(
            "ocde_naturaleza_institucion",
            "publica",
            "publica",
            "Publica",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_naturaleza_institucion",
            "privada",
            "privada",
            "Privada",
            None,
            1,
        ),
        // 5. OCDE tipo_proyecto (Oslo/Frascati) - Tipos de actividad
        SeedEntry::new(
            "ocde_tipo_proyecto",
            "investigacion_basica",
            "investigacion_basica",
            "Investigacion Basica",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_tipo_proyecto",
            "investigacion_aplicada",
            "investigacion_aplicada",
            "Investigacion Aplicada",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_tipo_proyecto",
            "desarrollo_experimental",
            "desarrollo_experimental",
            "Desarrollo Experimental",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_tipo_proyecto",
            "innovacion",
            "innovacion",
            "Innovacion (Manual de Oslo)",
            None,
            1,
        ),
        SeedEntry::new(
            "ocde_tipo_proyecto",
            "transferencia",
            "transferencia",
            "Transferencia Tecnologica",
            None,
            1,
        ),
        // 6. SUNEDU tipo_institucion
        SeedEntry::new(
            "sunedu_tipo_institucion",
            "universidad",
            "universidad",
            "Universidad",
            None,
            1,
        ),
        SeedEntry::new(
            "sunedu_tipo_institucion",
            "instituto",
            "instituto",
            "Instituto de Educacion Superior",
            None,
            1,
        ),
        SeedEntry::new(
            "sunedu_tipo_institucion",
            "escuela",
            "escuela",
            "Escuela de Educacion Superior",
            None,
            1,
        ),
        // 7. RENATI level (Grados academicos) -- alias a feature `grados`
        SeedEntry::new(
            "renati_level",
            "bachiller",
            "bachiller",
            "Bachiller",
            None,
            1,
        ),
        SeedEntry::new(
            "renati_level",
            "maestro",
            "maestro",
            "Maestro / Magister",
            None,
            1,
        ),
        SeedEntry::new("renati_level", "doctor", "doctor", "Doctor", None, 1),
        SeedEntry::new(
            "renati_level",
            "licenciado",
            "licenciado",
            "Licenciado (Titulo Profesional)",
            None,
            1,
        ),
        SeedEntry::new(
            "renati_level",
            "segunda_especialidad",
            "segunda_especialidad",
            "Segunda Especialidad",
            None,
            1,
        ),
        // 8. RENATI type -- Tipos de trabajo de investigacion
        SeedEntry::new("renati_type", "tesis", "tesis", "Tesis", None, 1),
        SeedEntry::new(
            "renati_type",
            "trabajo_investigacion",
            "trabajo_investigacion",
            "Trabajo de Investigacion",
            None,
            1,
        ),
        SeedEntry::new(
            "renati_type",
            "trabajo_suficiencia",
            "trabajo_suficiencia",
            "Trabajo de Suficiencia Profesional",
            None,
            1,
        ),
        SeedEntry::new(
            "renati_type",
            "informe_tecnico",
            "informe_tecnico",
            "Informe Tecnico",
            None,
            1,
        ),
        // 9. CONCYTEC tipo_subunidad
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "facultad",
            "facultad",
            "Facultad",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "departamento_academico",
            "departamento_academico",
            "Departamento Academico",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "escuela_profesional",
            "escuela_profesional",
            "Escuela Profesional",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "grupo_investigacion",
            "grupo_investigacion",
            "Grupo de Investigacion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "linea_investigacion",
            "linea_investigacion",
            "Linea de Investigacion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "laboratorio",
            "laboratorio",
            "Laboratorio de Investigacion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_tipo_subunidad",
            "vicerrectorado",
            "vicerrectorado",
            "Vicerrectorado de Investigacion",
            None,
            1,
        ),
        // 10. CONCYTEC estado_proyecto
        SeedEntry::new(
            "concytec_estado_proyecto",
            "formulacion",
            "formulacion",
            "Formulacion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_estado_proyecto",
            "evaluacion",
            "evaluacion",
            "Evaluacion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_estado_proyecto",
            "ejecucion",
            "ejecucion",
            "Ejecucion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_estado_proyecto",
            "cierre",
            "cierre",
            "Cierre",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_estado_proyecto",
            "cerrado",
            "cerrado",
            "Cerrado",
            None,
            1,
        ),
        // 11. CONCYTEC equipamiento
        SeedEntry::new(
            "concytec_equipamiento",
            "espectrometro",
            "espectrometro",
            "Espectrometro",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_equipamiento",
            "secuenciador",
            "secuenciador",
            "Secuenciador",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_equipamiento",
            "microscopio",
            "microscopio",
            "Microscopio",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_equipamiento",
            "cromatografo",
            "cromatografo",
            "Cromatografo",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_equipamiento",
            "reactor",
            "reactor",
            "Reactor",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_equipamiento",
            "robot_industrial",
            "robot_industrial",
            "Robot Industrial",
            None,
            1,
        ),
        // 12. CONCYTEC uso_equipamiento
        SeedEntry::new(
            "concytec_uso_equipamiento",
            "investigacion",
            "investigacion",
            "Investigacion",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_uso_equipamiento",
            "docencia",
            "docencia",
            "Docencia",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_uso_equipamiento",
            "servicios",
            "servicios",
            "Servicios a Terceros",
            None,
            1,
        ),
        // 13. CONCYTEC terminos (subset relevante)
        // Genero
        SeedEntry::new(
            "concytec_terminos",
            "masculino",
            "masculino",
            "Masculino",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "femenino",
            "femenino",
            "Femenino",
            None,
            1,
        ),
        // Ambito geografico
        SeedEntry::new(
            "concytec_terminos",
            "ambito_local",
            "ambito_local",
            "Local",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "ambito_regional",
            "ambito_regional",
            "Regional",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "ambito_nacional",
            "ambito_nacional",
            "Nacional",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "ambito_internacional",
            "ambito_internacional",
            "Internacional",
            None,
            1,
        ),
        // Tipo de organizacion
        SeedEntry::new(
            "concytec_terminos",
            "tipo_org_universidad",
            "tipo_org_universidad",
            "Universidad",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "tipo_org_instituto",
            "tipo_org_instituto",
            "Instituto de Investigacion",
            None,
            1,
        ),
        // Cuartiles
        SeedEntry::new("concytec_terminos", "q1", "q1", "Q1", None, 1),
        SeedEntry::new("concytec_terminos", "q2", "q2", "Q2", None, 1),
        SeedEntry::new("concytec_terminos", "q3", "q3", "Q3", None, 1),
        SeedEntry::new("concytec_terminos", "q4", "q4", "Q4", None, 1),
        // Cuartil WoS
        SeedEntry::new("concytec_terminos", "wos_q1", "wos_q1", "Q1 (WoS)", None, 1),
        SeedEntry::new("concytec_terminos", "wos_q2", "wos_q2", "Q2 (WoS)", None, 1),
        SeedEntry::new("concytec_terminos", "wos_q3", "wos_q3", "Q3 (WoS)", None, 1),
        SeedEntry::new("concytec_terminos", "wos_q4", "wos_q4", "Q4 (WoS)", None, 1),
        // Tipo publicacion (subset CERIF / PeruCRIS visible)
        SeedEntry::new(
            "concytec_terminos",
            "articulo",
            "articulo",
            "Articulo",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "articulo_revista",
            "articulo_revista",
            "Journal article",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "articulo_conferencia",
            "articulo_conferencia",
            "Conference paper",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "carta",
            "carta",
            "Carta / Letter",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "resena",
            "resena",
            "Resena / Review",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "comunicacion_congreso",
            "comunicacion_congreso",
            "Comunicacion de congreso",
            None,
            1,
        ),
        SeedEntry::new("concytec_terminos", "libro", "libro", "Libro", None, 1),
        SeedEntry::new(
            "concytec_terminos",
            "capitulo_libro",
            "capitulo_libro",
            "Capitulo de libro",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "software",
            "software",
            "Software",
            None,
            1,
        ),
        // Acceso abierto
        SeedEntry::new(
            "concytec_terminos",
            "acceso_abierto",
            "acceso_abierto",
            "Acceso Abierto",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "solo_metadatos",
            "solo_metadatos",
            "Solo Metadatos",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "embargado",
            "embargado",
            "Embargado",
            None,
            1,
        ),
        // Modalidad financiamiento
        SeedEntry::new(
            "concytec_terminos",
            "modalidad_i+d",
            "modalidad_i+d",
            "I+D+i",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "modalidad_equipamiento",
            "modalidad_equipamiento",
            "Equipamiento",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "modalidad_pasantias",
            "modalidad_pasantias",
            "Pasantias",
            None,
            1,
        ),
        SeedEntry::new(
            "concytec_terminos",
            "modalidad_eventos",
            "modalidad_eventos",
            "Eventos Academicos",
            None,
            1,
        ),
        // 14. MINAM tematicas ambientales
        SeedEntry::new(
            "minam_tematicas_ambientales",
            "cambio_climatico",
            "cambio_climatico",
            "Cambio Climatico",
            None,
            1,
        ),
        SeedEntry::new(
            "minam_tematicas_ambientales",
            "biodiversidad",
            "biodiversidad",
            "Biodiversidad",
            None,
            1,
        ),
        SeedEntry::new(
            "minam_tematicas_ambientales",
            "calidad_ambiental",
            "calidad_ambiental",
            "Calidad Ambiental",
            None,
            1,
        ),
        SeedEntry::new(
            "minam_tematicas_ambientales",
            "recursos_hidricos",
            "recursos_hidricos",
            "Recursos Hidricos",
            None,
            1,
        ),
        // 15. INS tematicas salud
        SeedEntry::new(
            "ins_tematicas_salud",
            "salud_publica",
            "salud_publica",
            "Salud Publica",
            None,
            1,
        ),
        SeedEntry::new(
            "ins_tematicas_salud",
            "enfermedades_infecciosas",
            "enfermedades_infecciosas",
            "Enfermedades Infecciosas",
            None,
            1,
        ),
        SeedEntry::new(
            "ins_tematicas_salud",
            "nutricion",
            "nutricion",
            "Nutricion",
            None,
            1,
        ),
        SeedEntry::new(
            "ins_tematicas_salud",
            "salud_mental",
            "salud_mental",
            "Salud Mental",
            None,
            1,
        ),
    ]
}

pub struct SeedEntry {
    pub esquema: &'static str,
    pub codigo_skos: &'static str,
    pub codigo_interno: &'static str,
    pub nombre: &'static str,
    pub padre_codigo: Option<&'static str>,
    pub nivel: i32,
}

impl SeedEntry {
    const fn new(
        esquema: &'static str,
        codigo_skos: &'static str,
        codigo_interno: &'static str,
        nombre: &'static str,
        padre_codigo: Option<&'static str>,
        nivel: i32,
    ) -> Self {
        Self {
            esquema,
            codigo_skos,
            codigo_interno,
            nombre,
            padre_codigo,
            nivel,
        }
    }
}

/// Inserta los 15 vocabularios CONCYTEC si la coleccion esta vacia (idempotente).
/// Reimportar con `reseed_vocabularios_concytec` solo cuando bumpea
/// `VOCAB_CONCYTEC_VERSION`.
pub async fn seed_vocabularios_concytec_if_empty(db: &Database) -> Result<(), AppError> {
    let count = db
        .collection::<mongodb::bson::Document>("catalogos")
        .count_documents(doc! { "esquema": { "$exists": true } })
        .await?;
    if count > 0 {
        return Ok(());
    }
    reseed_vocabularios_concytec(db).await
}

/// Borra cualquier item con `esquema` presente y reinserta el set actual.
/// NO toca los catalogos internos legacy (sin `esquema`).
pub async fn reseed_vocabularios_concytec(db: &Database) -> Result<(), AppError> {
    db.collection::<mongodb::bson::Document>("catalogos")
        .delete_many(doc! { "esquema": { "$exists": true } })
        .await?;

    for entry in seed_entries() {
        let req = CreateCatalogoRequest {
            tipo: entry.esquema.to_string(),
            codigo: entry.codigo_interno.to_string(),
            nombre: entry.nombre.to_string(),
            descripcion: None,
            orden: None,
            esquema: Some(entry.esquema.to_string()),
            codigo_skos: Some(entry.codigo_skos.to_string()),
            padre_codigo: entry.padre_codigo.map(|s| s.to_string()),
            nivel: Some(entry.nivel),
            etiquetas: None,
            editable: false, // vocabularios oficiales CONCYTEC, lock
        };
        repository::create_catalogo(db, req).await?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn seed_entries_have_unique_pairs() {
        let entries = seed_entries();
        let mut seen: std::collections::HashSet<(String, String)> =
            std::collections::HashSet::new();
        for e in &entries {
            let key = (e.esquema.to_string(), e.codigo_skos.to_string());
            assert!(seen.insert(key.clone()), "Duplicado en seed: {key:?}");
        }
    }

    #[test]
    fn hierarchy_consistency_ford() {
        let entries = seed_entries();
        let by_code: std::collections::HashMap<String, &SeedEntry> = entries
            .iter()
            .filter(|e| e.esquema == "ocde_ford")
            .map(|e| (e.codigo_skos.to_string(), e))
            .collect();
        for e in entries.iter().filter(|e| e.esquema == "ocde_ford") {
            if let Some(parent) = e.padre_codigo {
                assert!(
                    by_code.contains_key(parent),
                    "Padre '{parent}' no presente para '{}'",
                    e.codigo_skos
                );
            }
        }
    }

    #[test]
    fn version_constant_set() {
        assert!(!VOCAB_CONCYTEC_VERSION.is_empty());
    }
}
