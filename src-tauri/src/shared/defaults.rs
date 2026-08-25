pub const RENIEC_API_BASE_URL: &str = "https://api.decolecta.com/v1";
pub const RENACYT_API_BASE_URL: &str = "https://renacyt.concytec.gob.pe/renacyt-backend";
pub const RENACYT_FICHA_BASE_URL: &str = "https://servicio-renacyt.concytec.gob.pe/ficha-renacyt/";
pub const RENACYT_ACTO_VERSION: &str = "2021";
pub const PURE_API_BASE_URL: &str = "https://pure.unf.edu.pe/ws/api";
pub const PERUCRIS_API_BASE_URL: &str = "https://perucris.example.org/api";
/// HAL root PUBLICO de PeruCRIS (no requiere api-key).
/// Usado por el validador de sincronizacion (`perucris_validator`).
/// Se diferencia del `PERUCRIS_API_BASE_URL` (placeholder del endpoint
/// de ingesta) en que este SI existe y es accesible sin credenciales.
pub const PERUCRIS_PUBLIC_API_BASE_URL: &str = "https://rest.perucris.pe/server/api";
pub const DEFAULT_MONGODB_DB: &str = "pjvpin";

// Pool de conexiones MongoDB. Para una app de escritorio single-user
// (pocos handlers concurrentes por ventana) 10 conexiones maximas es mas
// que suficiente y evita saturar MongoDB Atlas en free tier.
pub const DEFAULT_MONGODB_MAX_POOL_SIZE: u32 = 10;
pub const DEFAULT_MONGODB_MIN_POOL_SIZE: u32 = 1;

// Valores de prueba para tests de conectividad del wizard.
// Todos son publicos (RENIEC/DNI y RENACYT/CTI Vitae son registros publicos).
//
// Semantica del test RENIEC: el DNI "00000000" NO existe en RENIEC, por lo que
// la API responde HTTP 404. El handler del wizard (`config_wizard.rs::test_reniec_connectivity`)
// trata 404 como EXITO ("API y token validos (DNI de prueba no existe, esperado)"):
// el objetivo es validar endpoint + token, no la existencia del registro.
// Si se reporta "Sin conexion", el problema es de transporte (DNS/TLS/proxy),
// no del DNI de prueba.
pub const RENIEC_TEST_DNI: &str = "00000000";
pub const RENACYT_TEST_CTI_VITAE: &str = "80203";
pub const RENACYT_TEST_ACTO_VERSION: &str = "2021";

// Version del set de vocabularios CONCYTEC embebidos en
// `catalogos::seed_vocabularios`. Bumpear este valor para forzar un re-seed
// via `catalogos::seed_vocabularios::reseed_vocabularios_concytec`.
pub const VOCAB_CONCYTEC_VERSION: &str = "2026-08-12-alpha";

// ── Pure Master List (V8) ─────────────────────────────────────────────────────
// Constantes que el reporte `pure-masterlist` aplica como single source of
// truth. Ajustar aqui si la institucion evoluciona su estructura
// organizativa o su politica de visibilidad.

/// `OrganisationID` que el master list apunta para todas las afiliaciones.
/// Debe existir en la tab `Organisations` de la plantilla. Para la UNF es
/// `UNF001` (universidad raiz, identico al template institucional cargado).
pub const PURE_MASTERLIST_DEFAULT_ORG_UNIT_ID: &str = "UNF001";

/// `Visibility` por defecto (valor de la tab `Lists`).
/// `public` permite que el perfil sea visible en el portal de Pure.
pub const PURE_MASTERLIST_DEFAULT_VISIBILITY: &str = "public";

/// `EmployedAs` (scheme `/dk/atira/pure/person/employmenttypes`).
pub const PURE_MASTERLIST_DEFAULT_EMPLOYED_AS: &str = "academic";

/// `StaffType` (scheme `/dk/atira/pure/person/personstafftype`).
pub const PURE_MASTERLIST_DEFAULT_STAFF_TYPE: &str = "academic";

/// `StartDate` por defecto de las afiliaciones. Coincide con la fecha
/// institucional usada en el template existente (2025-06-02).
pub const PURE_MASTERLIST_DEFAULT_START_DATE: &str = "2025-06-02";

/// `ExternallyAuthenticated` por defecto. La plantilla institucional usa
/// `yes` para todos los investigadores.
pub const PURE_MASTERLIST_DEFAULT_EXTERNALLY_AUTH: &str = "yes";

/// Prefijo para PersonIDs de altas nuevas. Distinto de `PER` (reservado
/// para los PersonIDs institucionales ya cargados) para evitar colisiones.
pub const PURE_MASTERLIST_NEW_PERSON_PREFIX: &str = "PJV-";

/// Genera un PersonID deterministico para un investigador nuevo (no
/// presente en Pure). Formato: `PJV-{dni}`. Vacio si el DNI es vacio.
pub fn pure_masterlist_new_person_id(dni: &str) -> String {
    let trimmed = dni.trim();
    if trimmed.is_empty() {
        String::new()
    } else {
        format!("{}{}", PURE_MASTERLIST_NEW_PERSON_PREFIX, trimmed)
    }
}
