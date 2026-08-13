//! Feature `geo` — Ubigeo INEI (codigos de 6 digitos).
//!
//! Almacena las ubicaciones geograficas peruanas estandarizadas por el INEI
//! (departamento, provincia, distrito). Es una entidad maestra usada como FK
//! por `org_units.ubigeo_codigo` y, potencialmente, por investigadores y
//! financiamientos.
//!
//! Mantiene el patron del proyecto:
//!
//! - `models.rs`: dominio puro (sin serde), invariantes validadas en `new()`.
//! - `dto.rs`: structs `*Doc` para BSON (snake_case) y `UbigeoDto`/`*Request`
//!   para IPC (snake_case en salida, camelCase en entrada via
//!   `#[serde(rename_all = "camelCase")]`).
//! - `repository.rs`: conversions Document ↔ Dto ↔ Model, queries driver.
//! - `seed.rs`: inserta los 24 departamentos INEI canonicos si la coleccion
//!   esta vacia.
//! - `tests.rs`: tests de modelo.

pub mod commands;
pub mod dto;
pub mod handlers;
pub mod models;
pub mod repository;
pub mod seed;

pub use repository::drop_dev_collection;
pub use seed::{reseed_ubigeos, seed_ubigeos_if_empty};
