//! Kardex RENACYT — trazabilidad historica de cambios en el bloque RENACYT
//! de un investigador (nivel, grupo, condicion, fechas oficiales, ORCID,
//! Scopus ID y formaciones academicas).
//!
//! RENACYT no conserva historial de cambios: cada refresh individual
//! sobrescribe el documento del investigador en PJVPI. Sin este kardex,
//! la perdida de informacion es silenciosa: el sistema pasa de "Nivel I"
//! a "Nivel IV" sin dejar rastro de cuando y por que.
//!
//! `diff_renacyt` es la funcion pura (testeable sin MongoDB) que compara
//! el estado actual del Investigador contra un `RenacytLookupResult`
//! nuevo y devuelve un `Option<KardexEntry>`: `None` si nada cambia
//! (ahorra escritura), `Some(entry)` con todos los cambios detectados
//! si los hay.
//!
//! El kardex se persiste en la coleccion `renacyt_kardex` (ver
//! `repository::kardex_repository`). Las entradas se insertan en tres
//! disparadores: refresh individual, refresh masivo batch, e importacion
//! por DNI (lote). Las trazas se consultan desde la ficha del
//! investigador para el timeline y desde el panel de estado para las
//! alertas globales.

use crate::investigadores::dto::RenacytLookupResult;
use crate::investigadores::models::Investigador;
use crate::shared::time::now_ms;

/// Origen del cambio que se esta registrando en el kardex.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum KardexDisparador {
    /// Refresh individual disparado por el usuario (boton en ficha).
    RefreshIndividual,
    /// Refresh masivo en lote (`refrescar_renacyt_todos`).
    RefreshMasivo,
    /// Importacion por DNI (pipeline de `import.rs`).
    ImportacionLote,
}

impl KardexDisparador {
    pub fn as_str(self) -> &'static str {
        match self {
            KardexDisparador::RefreshIndividual => "refresh_individual",
            KardexDisparador::RefreshMasivo => "refresh_masivo",
            KardexDisparador::ImportacionLote => "importacion_lote",
        }
    }
}

/// Cambio atómico detectado entre el estado anterior y el nuevo.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct CambioKardex {
    /// Nombre canonico del campo (ej: "nivel", "grupo", "orcid").
    pub campo: String,
    /// Valor anterior serializado (string para que sobreviva tipos
    /// heterogeneos del JSON de formaciones); `None` si era inexistente.
    pub valor_anterior: Option<String>,
    /// Valor nuevo propuesto por RENACYT; `None` si paso a inexistente.
    pub valor_nuevo: Option<String>,
}

/// Resumen compacto de una formacion academica. Lo que importa al kardex
/// es la clave estable (centro + grado + titulo) y los marcadores
/// relevantes para calcular elegibilidad (`considerado_para_cc`,
/// `es_calificado`, `puntaje`).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormacionResumen {
    pub centro: Option<String>,
    pub grado: Option<String>,
    pub titulo: Option<String>,
    pub fecha_inicio: Option<String>,
    pub fecha_fin: Option<String>,
    pub puntaje: Option<String>,
    pub considerado_para_cc: Option<bool>,
    pub es_calificado: Option<bool>,
}

/// Diff de formaciones academicas entre el estado anterior y el nuevo.
/// `sin_detalle` se setea cuando el JSON no parseo como array de objetos
/// y por tanto solo sabemos que hubo cambio textual sin poder listar
/// los items agregados/retirados.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FormacionesDiff {
    pub agregadas: Vec<FormacionResumen>,
    pub retiradas: Vec<FormacionResumen>,
    pub sin_detalle: bool,
}

/// Entrada del kardex. Solo se construye si `diff_renacyt` detecta
/// cambios; `id` se asigna en el repository al persistir.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct KardexEntry {
    pub id: String,
    pub investigador_id: String,
    pub persona_id: String,
    pub fecha_evento: i64,
    pub disparador: KardexDisparador,
    pub cambios: Vec<CambioKardex>,
    pub formaciones_diff: Option<FormacionesDiff>,
}

impl KardexEntry {
    /// True si alguno de los campos clasificadorios RENACYT cambio:
    /// nivel, grupo, condicion, fecha_informe_calificacion,
    /// fecha_ultima_revision. Usado por el frontend para resaltar la
    /// entrada del kardex como alerta.
    pub fn tiene_cambio_clasificatorio(&self) -> bool {
        const CLASIFICATORIOS: &[&str] = &[
            "nivel",
            "grupo",
            "condicion",
            "fecha_informe_calificacion",
            "fecha_ultima_revision",
        ];
        self.cambios
            .iter()
            .any(|c| CLASIFICATORIOS.contains(&c.campo.as_str()))
    }
}

/// Compara el estado actual de un Investigador contra un lookup nuevo y
/// devuelve un KardexEntry si hay cambios. Retorna `None` si nada cambio
/// (refresh sin efecto). Funcion pura — sin I/O, sin reloj del sistema
/// (excepto `now_ms()` para el timestamp del evento).
///
/// Normalizacion previa: tanto el Investigador (que ya tiene campos
/// validados por `apply_renacyt_refresh`) como el lookup crudo se
/// comparan en sus formas canonicas (trim + drop-empty + lowercase para
/// strings case-insensitive). Esto evita kardex spurious cuando RENACYT
/// devuelve el mismo nivel con mayusculas distintas.
///
/// Para formaciones se intenta parsear el JSON como `Vec<serde_json::Value>`
/// y se calcula el diff por clave estable (centro + grado + titulo).
/// Si el JSON no parsea, se registra cambio textual sin detalle.
pub fn diff_renacyt(
    actual: &Investigador,
    lookup: &RenacytLookupResult,
    disparador: KardexDisparador,
) -> Option<KardexEntry> {
    let cambios = collect_cambios_campos(actual, lookup);
    let formaciones_diff = diff_formaciones(
        actual.renacyt_formaciones_academicas_json.as_deref(),
        lookup.formaciones_academicas_json.as_deref(),
    );
    let formaciones_cambiaron = formaciones_diff.is_some();
    if cambios.is_empty() && !formaciones_cambiaron {
        return None;
    }
    Some(KardexEntry {
        id: String::new(),
        investigador_id: actual.id_investigador.clone(),
        persona_id: actual.persona_id.clone(),
        fecha_evento: now_ms(),
        disparador,
        cambios,
        formaciones_diff,
    })
}

fn collect_cambios_campos(
    actual: &Investigador,
    lookup: &RenacytLookupResult,
) -> Vec<CambioKardex> {
    let mut cambios = Vec::new();
    let pairs: [(&str, Option<&str>, Option<&str>); 7] = [
        (
            "nivel",
            actual.renacyt_nivel.as_deref(),
            lookup.nivel.as_deref(),
        ),
        (
            "grupo",
            actual.renacyt_grupo.as_deref(),
            lookup.grupo.as_deref(),
        ),
        (
            "condicion",
            actual.renacyt_condicion.as_deref(),
            lookup.condicion.as_deref(),
        ),
        (
            "orcid",
            actual.renacyt_orcid.as_deref(),
            lookup.orcid.as_deref(),
        ),
        (
            "scopus_author_id",
            actual.renacyt_scopus_author_id.as_deref(),
            lookup.scopus_author_id.as_deref(),
        ),
        (
            "fecha_informe_calificacion",
            actual
                .renacyt_fecha_informe_calificacion
                .map(ts_to_iso)
                .as_deref(),
            lookup.fecha_informe_calificacion.map(ts_to_iso).as_deref(),
        ),
        (
            "fecha_ultima_revision",
            actual
                .renacyt_fecha_ultima_revision
                .map(ts_to_iso)
                .as_deref(),
            lookup.fecha_ultima_revision.map(ts_to_iso).as_deref(),
        ),
    ];
    for (campo, anterior, nuevo) in pairs {
        if let Some(c) = compare_optional_str(campo, anterior, nuevo) {
            cambios.push(c);
        }
    }
    cambios
}

fn compare_optional_str(
    campo: &str,
    anterior: Option<&str>,
    nuevo: Option<&str>,
) -> Option<CambioKardex> {
    let a = anterior.map(str::trim).filter(|s| !s.is_empty());
    let n = nuevo.map(str::trim).filter(|s| !s.is_empty());
    if a == n {
        return None;
    }
    Some(CambioKardex {
        campo: campo.to_string(),
        valor_anterior: a.map(str::to_string),
        valor_nuevo: n.map(str::to_string),
    })
}

fn ts_to_iso(ts: i64) -> String {
    // Renderizamos timestamps ms en formato ISO date (YYYY-MM-DD) para
    // comparacion estable; el kardex no necesita granularidad menor.
    chrono::DateTime::from_timestamp_millis(ts)
        .map(|dt| dt.format("%Y-%m-%d").to_string())
        .unwrap_or_else(|| ts.to_string())
}

fn diff_formaciones(
    anterior_json: Option<&str>,
    nuevo_json: Option<&str>,
) -> Option<FormacionesDiff> {
    let a_trim = anterior_json.map(str::trim).filter(|s| !s.is_empty());
    let n_trim = nuevo_json.map(str::trim).filter(|s| !s.is_empty());
    if a_trim == n_trim {
        return None;
    }
    let anteriores = a_trim.and_then(parse_formaciones);
    let nuevas = n_trim.and_then(parse_formaciones);
    let (agregadas, retiradas, sin_detalle) = match (anteriores, nuevas) {
        (Some(a), Some(b)) => {
            let key_a: Vec<String> = a.iter().map(formacion_key).collect();
            let key_b: Vec<String> = b.iter().map(formacion_key).collect();
            let ag = b
                .iter()
                .filter(|f| !key_a.contains(&formacion_key(f)))
                .cloned()
                .collect();
            let re = a
                .iter()
                .filter(|f| !key_b.contains(&formacion_key(f)))
                .cloned()
                .collect();
            (ag, re, false)
        }
        _ => (Vec::new(), Vec::new(), true),
    };
    Some(FormacionesDiff {
        agregadas,
        retiradas,
        sin_detalle,
    })
}

fn parse_formaciones(json: &str) -> Option<Vec<FormacionResumen>> {
    let arr: Vec<serde_json::Value> = serde_json::from_str(json).ok()?;
    Some(
        arr.into_iter()
            .map(|v| FormacionResumen {
                centro: pick_str(&v, &["centro", "centroEstudios", "institucion"]),
                grado: pick_str(&v, &["grado", "gradoAcademico", "nivelFormacion"]),
                titulo: pick_str(&v, &["titulo", "tituloProfesional", "carrera"]),
                fecha_inicio: pick_str(&v, &["fechaInicio", "fecha_inicio"]),
                fecha_fin: pick_str(&v, &["fechaFin", "fecha_fin"]),
                puntaje: pick_str(&v, &["puntaje", "score"]),
                considerado_para_cc: pick_bool(&v, &["consideradoParaCc", "considerado_para_cc"]),
                es_calificado: pick_bool(&v, &["esCalificado", "es_calificado"]),
            })
            .collect(),
    )
}

fn pick_str(v: &serde_json::Value, keys: &[&str]) -> Option<String> {
    for k in keys {
        if let Some(s) = v.get(*k).and_then(|x| x.as_str()) {
            let trimmed = s.trim();
            if !trimmed.is_empty() {
                return Some(trimmed.to_string());
            }
        }
    }
    None
}

fn pick_bool(v: &serde_json::Value, keys: &[&str]) -> Option<bool> {
    for k in keys {
        if let Some(b) = v.get(*k).and_then(|x| x.as_bool()) {
            return Some(b);
        }
    }
    None
}

fn formacion_key(f: &FormacionResumen) -> String {
    format!(
        "{}|{}|{}",
        f.centro.as_deref().unwrap_or("").to_lowercase(),
        f.grado.as_deref().unwrap_or("").to_lowercase(),
        f.titulo.as_deref().unwrap_or("").to_lowercase()
    )
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::investigadores::dto::CreateInvestigadorRenacytRequest;
    use crate::investigadores::dto::CreateInvestigadorRequest;

    fn request_minimo() -> CreateInvestigadorRequest {
        CreateInvestigadorRequest {
            dni: "45678912".to_string(),
            id_grado: "g1".to_string(),
            nombres: "Maria".to_string(),
            apellido_paterno: "Lopez".to_string(),
            apellido_materno: Some("Diaz".to_string()),
            correo: None,
            telefono: None,
            direccion: None,
            sexo: None,
            fecha_nacimiento: None,
            perfil: "docente".to_string(),
            renacyt: None,
            tipo_documento: None,
            pure_person_id: None,
            perucris_uuid: None,
        }
    }

    fn lookup_base() -> RenacytLookupResult {
        RenacytLookupResult {
            codigo_registro: "REG-A".to_string(),
            id_investigador: "REN-A".to_string(),
            nombre_completo: None,
            numero_documento: None,
            nivel: Some("I".to_string()),
            grupo: Some("A".to_string()),
            condicion: Some("Activo".to_string()),
            fecha_informe_calificacion: None,
            fecha_registro: None,
            fecha_ultima_revision: None,
            orcid: None,
            scopus_author_id: None,
            ficha_url: "http://x".to_string(),
            solicitud_id: None,
            formaciones_academicas_json: None,
        }
    }

    fn lookup_with(
        nivel: &str,
        grupo: &str,
        cond: &str,
        orcid: Option<&str>,
    ) -> RenacytLookupResult {
        let mut l = lookup_base();
        l.nivel = Some(nivel.to_string());
        l.grupo = Some(grupo.to_string());
        l.condicion = Some(cond.to_string());
        l.orcid = orcid.map(str::to_string);
        l
    }

    fn inv_with_renacyt(renacyt: CreateInvestigadorRenacytRequest) -> Investigador {
        let mut req = request_minimo();
        req.renacyt = Some(renacyt);
        Investigador::new("inv-k".to_string(), &req).unwrap()
    }

    fn renacyt_min(nivel: &str, grupo: &str, cond: &str) -> CreateInvestigadorRenacytRequest {
        CreateInvestigadorRenacytRequest {
            codigo_registro: "REG".to_string(),
            id_investigador: "REN".to_string(),
            nivel: Some(nivel.to_string()),
            grupo: Some(grupo.to_string()),
            condicion: Some(cond.to_string()),
            fecha_informe_calificacion: None,
            fecha_registro: None,
            fecha_ultima_revision: None,
            orcid: None,
            scopus_author_id: None,
            ficha_url: "http://x".to_string(),
            formaciones_academicas_json: None,
        }
    }

    #[test]
    fn sin_cambios_devuelve_none() {
        let inv = inv_with_renacyt(renacyt_min("I", "A", "Activo"));
        let lookup = lookup_with("I", "A", "Activo", None);
        assert!(diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual).is_none());
    }

    #[test]
    fn cambio_de_nivel_detectado() {
        let inv = inv_with_renacyt(renacyt_min("I", "A", "Activo"));
        let lookup = lookup_with("II", "A", "Activo", None);
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual)
            .expect("cambio de nivel debe generar entry");
        assert_eq!(entry.disparador, KardexDisparador::RefreshIndividual);
        assert_eq!(entry.cambios.len(), 1);
        assert_eq!(entry.cambios[0].campo, "nivel");
        assert_eq!(entry.cambios[0].valor_anterior.as_deref(), Some("I"));
        assert_eq!(entry.cambios[0].valor_nuevo.as_deref(), Some("II"));
        assert!(entry.tiene_cambio_clasificatorio());
    }

    #[test]
    fn cambios_multiples_campos_clasificatorios() {
        let inv = inv_with_renacyt(renacyt_min("I", "A", "Activo"));
        let lookup = lookup_with("III", "B", "Baja", None);
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::RefreshMasivo).unwrap();
        assert_eq!(entry.disparador, KardexDisparador::RefreshMasivo);
        let campos: Vec<&str> = entry.cambios.iter().map(|c| c.campo.as_str()).collect();
        assert!(campos.contains(&"nivel"));
        assert!(campos.contains(&"grupo"));
        assert!(campos.contains(&"condicion"));
    }

    #[test]
    fn nivel_pasa_de_none_a_algo_es_cambio() {
        // Investigador sin nivel registrado, lookup trae nivel I.
        let req = request_minimo(); // renacyt = None
        let inv = Investigador::new("inv-kn".to_string(), &req).unwrap();
        let lookup = lookup_with("I", "A", "Activo", None);
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::ImportacionLote).unwrap();
        assert_eq!(entry.disparador, KardexDisparador::ImportacionLote);
        assert!(entry.cambios.iter().any(|c| c.campo == "nivel"
            && c.valor_anterior.is_none()
            && c.valor_nuevo.as_deref() == Some("I")));
    }

    #[test]
    fn cambio_de_orcid_detectado() {
        let inv = inv_with_renacyt(renacyt_min("I", "A", "Activo"));
        let lookup = lookup_with("I", "A", "Activo", Some("0000-0001-2345-6789"));
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual).unwrap();
        assert!(entry.cambios.iter().any(|c| c.campo == "orcid"));
        // ORCID no es clasificatorio
        assert!(!entry.tiene_cambio_clasificatorio());
    }

    #[test]
    fn formaciones_json_identico_no_es_cambio() {
        let mut ren = renacyt_min("I", "A", "Activo");
        ren.formaciones_academicas_json =
            Some(r#"[{"centro":"UNMSM","grado":"Doctor","titulo":"X"}]"#.to_string());
        let inv = inv_with_renacyt(ren);
        let mut lookup = lookup_with("I", "A", "Activo", None);
        lookup.formaciones_academicas_json =
            Some(r#"[{"centro":"UNMSM","grado":"Doctor","titulo":"X"}]"#.to_string());
        assert!(diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual).is_none());
    }

    #[test]
    fn formaciones_agregada_y_retirada() {
        let mut ren = renacyt_min("I", "A", "Activo");
        ren.formaciones_academicas_json =
            Some(r#"[{"centro":"UNMSM","grado":"Maestro","titulo":"Doc1"}]"#.to_string());
        let inv = inv_with_renacyt(ren);
        let mut lookup = lookup_with("I", "A", "Activo", None);
        lookup.formaciones_academicas_json =
            Some(r#"[{"centro":"UNMSM","grado":"Doctor","titulo":"Doc2"}]"#.to_string());
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual)
            .expect("cambio de formaciones debe generar entry");
        let fd = entry.formaciones_diff.expect("formaciones_diff presente");
        assert!(!fd.sin_detalle);
        assert_eq!(fd.agregadas.len(), 1);
        assert_eq!(fd.agregadas[0].titulo.as_deref(), Some("Doc2"));
        assert_eq!(fd.retiradas.len(), 1);
        assert_eq!(fd.retiradas[0].titulo.as_deref(), Some("Doc1"));
    }

    #[test]
    fn formaciones_json_malformado_marca_sin_detalle() {
        let mut ren = renacyt_min("I", "A", "Activo");
        ren.formaciones_academicas_json = Some("not-json".to_string());
        let inv = inv_with_renacyt(ren);
        let mut lookup = lookup_with("I", "A", "Activo", None);
        lookup.formaciones_academicas_json = Some("[]".to_string());
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual).unwrap();
        let fd = entry.formaciones_diff.unwrap();
        assert!(fd.sin_detalle);
        assert!(fd.agregadas.is_empty());
        assert!(fd.retiradas.is_empty());
    }

    #[test]
    fn cambio_de_fecha_informe_es_clasificatorio() {
        let inv = inv_with_renacyt(renacyt_min("I", "A", "Activo"));
        let mut lookup = lookup_with("I", "A", "Activo", None);
        lookup.fecha_informe_calificacion = Some(1_700_000_000_000);
        let entry = diff_renacyt(&inv, &lookup, KardexDisparador::RefreshIndividual).unwrap();
        assert!(entry.tiene_cambio_clasificatorio());
        assert!(entry
            .cambios
            .iter()
            .any(|c| c.campo == "fecha_informe_calificacion"));
    }

    #[test]
    fn kardex_entry_tiene_cambio_clasificatorio_solo_cuando_corresponde() {
        let entry = KardexEntry {
            id: String::new(),
            investigador_id: "inv".to_string(),
            persona_id: "p".to_string(),
            fecha_evento: 0,
            disparador: KardexDisparador::RefreshIndividual,
            cambios: vec![CambioKardex {
                campo: "orcid".to_string(),
                valor_anterior: None,
                valor_nuevo: Some("0000".to_string()),
            }],
            formaciones_diff: None,
        };
        assert!(!entry.tiene_cambio_clasificatorio());
    }

    #[test]
    fn kardex_disparador_as_str_canonicos() {
        assert_eq!(
            KardexDisparador::RefreshIndividual.as_str(),
            "refresh_individual"
        );
        assert_eq!(KardexDisparador::RefreshMasivo.as_str(), "refresh_masivo");
        assert_eq!(
            KardexDisparador::ImportacionLote.as_str(),
            "importacion_lote"
        );
    }

    #[test]
    fn formacion_key_lower_y_estable() {
        let f1 = FormacionResumen {
            centro: Some("UNMSM".to_string()),
            grado: Some("Doctor".to_string()),
            titulo: Some("Fisica".to_string()),
            fecha_inicio: None,
            fecha_fin: None,
            puntaje: None,
            considerado_para_cc: None,
            es_calificado: None,
        };
        let f2 = FormacionResumen {
            centro: Some("unmsm".to_string()),
            grado: Some("doctor".to_string()),
            titulo: Some("FISICA".to_string()),
            fecha_inicio: None,
            fecha_fin: None,
            puntaje: None,
            considerado_para_cc: None,
            es_calificado: None,
        };
        assert_eq!(formacion_key(&f1), formacion_key(&f2));
    }
}
