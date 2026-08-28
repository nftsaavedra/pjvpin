/**
 * Enumeracion de permisos 1:1 con el enum Rust `AppPermission` (censo 03 §10).
 * Mantener sincronizado con:
 *  - src-tauri/src/shared/rbac.rs
 *  - apps/desktop/src/shared/auth/permissions.ts (frontend, naming dotted en TS)
 */
export enum AppPermission {
  DashboardView = "DashboardView",
  InvestigadoresView = "InvestigadoresView",
  InvestigadoresManage = "InvestigadoresManage",
  ProyectosView = "ProyectosView",
  ProyectosManage = "ProyectosManage",
  PublicacionesView = "PublicacionesView",
  PublicacionesManage = "PublicacionesManage",
  ReportesView = "ReportesView",
  ReportesExport = "ReportesExport",
  GradosRead = "GradosRead",
  GradosManage = "GradosManage",
  GruposView = "GruposView",
  GruposManage = "GruposManage",
  RecursosManage = "RecursosManage",
  CatalogosRead = "CatalogosRead",
  CatalogosManage = "CatalogosManage",
  UsuariosManage = "UsuariosManage",
  GeoRead = "GeoRead",
  OrgUnitsView = "OrgUnitsView",
  OrgUnitsManage = "OrgUnitsManage",
  VocabulariosRead = "VocabulariosRead",
  VocabulariosManage = "VocabulariosManage",
  OcdeAssignManage = "OcdeAssignManage",
}
