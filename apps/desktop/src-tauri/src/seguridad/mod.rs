//! Feature `seguridad` — Fachada IPC de status de configuración y guías.
//!
//! Esta capa expone comandos Tauri para:
//! - `get_security_status` — diagnostico de servicios externos configurados.
//! - `get_setup_guide` — guia paso-a-paso del wizard.
//! - `get_security_recommendations` — recomendaciones de hardening.
//! - `wizard_*` — operaciones del asistente de configuración.
//!
//! **Estructura intencional**: este modulo NO sigue el patron
//! `commands/handlers/models/repository` porque actua como capa IPC delgada.
//! Su logica de negocio vive en:
//! - `shared::config_wizard` (test de conectividad, save/load de config).
//! - `shared::rbac` y `shared::access_control` (autorización consolidada).
//! - `shared::tokens` (TokenResolver para credenciales externas).
//!
//! Por eso el modulo solo expone `commands.rs` (fachada) + `dto.rs`
//! (structs de respuesta). Agregar `handlers.rs`/`models.rs`/`repository.rs`
//! seria over-engineering sin logica de dominio que aislar.
//!
//! La consolidacion de RBAC ya existe via `shared::access_control` que
//! re-exporta desde `shared::rbac` — unica fuente de verdad.

pub mod commands;
pub mod dto;

#[cfg(test)]
mod dto_tests;
