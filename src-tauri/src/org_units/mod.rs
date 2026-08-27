//! Feature `org_units` — Unidades organizativas (CERIF/PeruCRIS).
//!
//! Equivalente relacional a la entidad `org_units` de CONCYTEC/PeruCRIS.
//! Modelo C4: organizaciones institucionales de la universidad (matriz +
//! sub-unidades: facultades, departamentos, grupos, laboratorios, lineas).
//!
//! Mantiene el patron del proyecto:
//!
//! - `models.rs`: dominio puro (sin serde), invariantes validadas en `new()`.
//! - `dto.rs`: structs `*Doc` para BSON (snake_case) y `OrgUnitDto`/`*Request`
//!   para IPC.
//! - `repository.rs`: conversions Document ↔ Dto ↔ Model + helpers FK +
//!   gestion de jerarquia (cycle/self-parent detection).

pub mod commands;
pub mod dto;
pub mod handlers;
pub mod models;
pub mod repository;
pub mod seed;

#[cfg(test)]
mod dto_tests;
