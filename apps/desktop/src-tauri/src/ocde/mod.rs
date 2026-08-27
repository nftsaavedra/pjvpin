//! Feature `ocde`.
//!
//! Aporta el pivot polimorfico `entity_ocde_fields` que asocia codigos SKOS
//! del vocabulario `ocde_ford` a cualquier entidad del modelo (PROJECT,
//! EQUIPMENT, ORG_UNIT, PATENT). Esto reemplaza el campo legacy `campo_ocde`
//! en `proyectos` por una tabla normalizada (FK) que respeta el modelo
//! CERIF: una entidad puede tener varios codigos FORD (multi-disciplinariedad).
//!
//! Reglas:
//! - `entity_type` se valida contra `vocab_mapper::ENTITY_TYPES_VALIDOS`.
//! - `ocde_codigo` se valida como FK via `refs::ensure_vocab_active`.
//! - UNIQUE (entity_type, entity_id, ocde_codigo) en `shared/db.rs`.

pub mod commands;
pub mod dto;
pub mod handlers;
pub mod models;
pub mod repository;

#[cfg(test)]
mod tests;

pub const COLLECTION: &str = "entity_ocde_fields";
