//! Loader para el reporte "Pure Master List".
//!
//! Genera las filas de las hojas `Persons` y `Stafforganisationrelations`
//! del master list V8 de Elsevier Pure, junto con un resumen no-bloqueante
//! para mostrar en la UI antes del export.
//!
//! Reglas:
//! - Solo investigadores `activo=1`.
//! - Carga personas por mapa (NO loop N+1) usando `data_loader`.
//! - `person_id` = `investigador.pure_person_id` (PER000X ya en Pure) o
//!   `PJV-{dni}` para altas nuevas (namespace propio, sin colision).
//! - `gender` normalizado a valores del Lists tab: `male`/`female`/`unknown`.
//! - Defaults (UNF001, public, academic, yes, 2025-06-02) en
//!   `shared::defaults` (single source).

use mongodb::Database;

use crate::investigadores::repository as investigadores_repo;
use crate::personas::repository as personas_repo;
use crate::reportes::dto::{
    PureMasterlistData, PureMasterlistPersonRow, PureMasterlistStaffRow, PureMasterlistSummary,
};
use crate::shared::defaults::{
    pure_masterlist_new_person_id, PURE_MASTERLIST_DEFAULT_EMPLOYED_AS,
    PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH, PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID,
    PURE_MASTERLIST_DEFAULT_STAFF_TYPE, PURE_MASTERLIST_DEFAULT_START_DATE,
    PURE_MASTERLIST_DEFAULT_VISIBILITY,
};
use crate::shared::error::AppError;

/// Mapea `persona.sexo` (M / Masculino / Male / F / Femenino / Female / etc.)
/// a los valores canonicos del Lists tab de Pure (`male` / `female` / `unknown`).
/// Devuelve `unknown` para valores no reconocidos o ausentes (Pure lo acepta).
pub fn map_gender(sexo: Option<&str>) -> &'static str {
    let Some(raw) = sexo else {
        return "unknown";
    };
    match raw.trim().to_ascii_lowercase().as_str() {
        "m" | "male" | "masculino" | "masc" | "hombre" | "man" => "male",
        "f" | "female" | "femenino" | "fem" | "mujer" | "woman" => "female",
        _ => "unknown",
    }
}

/// Une apellido paterno y materno con un espacio. Si ambos son vacios,
/// devuelve `None` para no emitir una celda con un unico espacio.
fn join_apellidos(paterno: Option<&str>, materno: Option<&str>) -> Option<String> {
    let p = paterno.map(str::trim).filter(|s| !s.is_empty());
    let m = materno.map(str::trim).filter(|s| !s.is_empty());
    match (p, m) {
        (Some(p), Some(m)) => Some(format!("{p} {m}")),
        (Some(p), None) => Some(p.to_string()),
        (None, Some(m)) => Some(m.to_string()),
        (None, None) => None,
    }
}

/// Construye el payload completo (Persons + Staffrelations + Summary).
///
/// `pure_remote_total` (resumen) se calcula aparte porque implica una
/// llamada HTTP; el panel lo provee si ya hizo una sincronizacion
/// reciente. Si el caller no lo conoce, pasa `None` y el chip
/// "Pure remoto" se omite en el summary (la UI lo resuelve con el estado
/// del ultimo `sincronizar_pure_person_ids`).
pub async fn build_pure_masterlist_data(
    db: &Database,
    pure_remote_total: Option<usize>,
) -> Result<PureMasterlistData, AppError> {
    let investigadores = investigadores_repo::get_all_investigadores(db).await?;
    let personas = personas_repo::load_all_map(db).await?;

    let mut persons: Vec<PureMasterlistPersonRow> = Vec::with_capacity(investigadores.len());
    let mut staff_relations: Vec<PureMasterlistStaffRow> = Vec::with_capacity(investigadores.len());

    let mut actualizaciones_pure = 0usize;
    let mut altas_nuevas = 0usize;
    let mut sin_correo = 0usize;
    let mut sin_orcid = 0usize;

    for inv in &investigadores {
        let persona = match personas.get(&inv.persona_id) {
            Some(p) => p,
            None => continue,
        };

        let person_id = inv
            .pure_person_id
            .clone()
            .filter(|s| !s.trim().is_empty())
            .unwrap_or_else(|| pure_masterlist_new_person_id(&persona.dni));

        if inv.pure_person_id.is_some() {
            actualizaciones_pure += 1;
        } else {
            altas_nuevas += 1;
        }

        let correo_opt = persona
            .correo
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());
        if correo_opt.is_none() {
            sin_correo += 1;
        }

        let orcid_opt = inv
            .renacyt_orcid
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty());
        if orcid_opt.is_none() {
            sin_orcid += 1;
        }

        let lastname = join_apellidos(
            persona.apellido_paterno.as_deref(),
            persona.apellido_materno.as_deref(),
        );

        // ClientID_2: Scopus Author ID si existe.
        let client_id_2 = inv
            .renacyt_scopus_author_id
            .as_ref()
            .map(|s| s.trim())
            .filter(|s| !s.is_empty())
            .map(str::to_string);

        let email_value = correo_opt.map(str::to_string);

        persons.push(PureMasterlistPersonRow {
            person_id: person_id.clone(),
            profiled: "no".to_string(),
            username: email_value.clone(),
            email: email_value.clone(),
            title: None,
            title_translated: None,
            post_nominals: None,
            firstname: persona.nombres.clone(),
            lastname,
            firstname_translated: None,
            lastname_translated: None,
            first_name_known_as: None,
            last_name_known_as: None,
            first_name_sorting: None,
            last_name_sorting: None,
            former_last_name: None,
            prior_affiliations: None,
            nationality: None,
            gender: map_gender(persona.sexo.as_deref()).to_string(),
            visibility: PURE_MASTERLIST_DEFAULT_VISIBILITY.to_string(),
            orcid: orcid_opt.map(str::to_string),
            profile_photo: None,
            client_id_1: None,
            client_id_2,
            client_id_3: Some(persona.dni.clone()),
            externally_authenticated: PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH.to_string(),
        });

        staff_relations.push(PureMasterlistStaffRow {
            person_id,
            organisation_id: PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID.to_string(),
            contract_type: None,
            job_title: None,
            job_description: None,
            job_description_translated: None,
            employed_as: PURE_MASTERLIST_DEFAULT_EMPLOYED_AS.to_string(),
            fte: None,
            start_date: PURE_MASTERLIST_DEFAULT_START_DATE.to_string(),
            end_date: None,
            direct_phone_nr: None,
            mobile_phone_nr: None,
            fax_nr: None,
            email: email_value,
            website_url_en: None,
            website_url_translated: None,
            primary: "yes".to_string(),
            staff_type: PURE_MASTERLIST_DEFAULT_STAFF_TYPE.to_string(),
        });
    }

    let summary = PureMasterlistSummary {
        total: persons.len(),
        actualizaciones_pure,
        altas_nuevas,
        sin_correo,
        sin_orcid,
        pure_remoto_total: pure_remote_total.unwrap_or(0),
    };

    Ok(PureMasterlistData {
        persons,
        staff_relations,
        summary,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn map_gender_canonicos() {
        assert_eq!(map_gender(Some("male")), "male");
        assert_eq!(map_gender(Some("female")), "female");
    }

    #[test]
    fn map_gender_aliases_espanol() {
        assert_eq!(map_gender(Some("M")), "male");
        assert_eq!(map_gender(Some("Masculino")), "male");
        assert_eq!(map_gender(Some("F")), "female");
        assert_eq!(map_gender(Some("Femenino")), "female");
    }

    #[test]
    fn map_gender_case_insensitive() {
        assert_eq!(map_gender(Some("MALE")), "male");
        assert_eq!(map_gender(Some("  Female  ")), "female");
    }

    #[test]
    fn map_gender_none_y_desconocido() {
        assert_eq!(map_gender(None), "unknown");
        assert_eq!(map_gender(Some("")), "unknown");
        assert_eq!(map_gender(Some("otro")), "unknown");
    }

    #[test]
    fn join_apellidos_vacios_devuelve_none() {
        assert!(join_apellidos(None, None).is_none());
        assert!(join_apellidos(Some(""), Some("")).is_none());
    }

    #[test]
    fn join_apellidos_uno_solo() {
        assert_eq!(
            join_apellidos(Some("Perez"), None).as_deref(),
            Some("Perez")
        );
        assert_eq!(
            join_apellidos(None, Some("Gomez")).as_deref(),
            Some("Gomez")
        );
    }

    #[test]
    fn join_apellidos_dos_con_espacio() {
        assert_eq!(
            join_apellidos(Some("Perez"), Some("Gomez")).as_deref(),
            Some("Perez Gomez")
        );
    }

    #[test]
    fn pure_masterlist_new_person_id_formato() {
        assert_eq!(pure_masterlist_new_person_id("02857417"), "PJV-02857417");
    }

    #[test]
    fn pure_masterlist_new_person_id_vacio() {
        assert_eq!(pure_masterlist_new_person_id(""), "");
        assert_eq!(pure_masterlist_new_person_id("   "), "");
    }
}
