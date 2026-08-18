import { ui } from "./ui";
import { auth } from "./auth";
import { wizard } from "./wizard";
import { investigadores } from "./investigadores";
import { proyectos } from "./proyectos";
import { grupos } from "./grupos";
import { reportes } from "./reportes";
import { shared } from "./shared";
import { configuracion } from "./configuracion";
import { catalogos } from "./catalogos";
import { grados } from "./grados";
import { usuarios } from "./usuarios";
import { dashboard } from "./dashboard";
import { geo } from "./geo";
import { vocabularios } from "./vocabularios";
import { orgUnits } from "./org-units";

export { ui, type UiMessageKey } from "./ui";
export { auth, type AuthMessageKey } from "./auth";
export { wizard, type WizardMessageKey } from "./wizard";
export { investigadores, type InvestigadoresMessageKey } from "./investigadores";
export { proyectos, type ProyectosMessageKey } from "./proyectos";
export { grupos, type GruposMessageKey } from "./grupos";
export { reportes, type ReportesMessageKey } from "./reportes";
export { shared, type SharedMessageKey } from "./shared";
export { configuracion, type ConfiguracionMessageKey } from "./configuracion";
export { catalogos, type CatalogosMessageKey } from "./catalogos";
export { grados, type GradosMessageKey } from "./grados";
export { usuarios, type UsuariosMessageKey } from "./usuarios";
export { dashboard, type DashboardMessageKey } from "./dashboard";
export { geo, type GeoMessageKey } from "./geo";
export { vocabularios, type VocabulariosMessageKey } from "./vocabularios";
export { orgUnits, type OrgUnitsMessageKey } from "./org-units";

export const messages = {
  ui,
  auth,
  wizard,
  investigadores,
  proyectos,
  grupos,
  reportes,
  shared,
  configuracion,
  catalogos,
  grados,
  usuarios,
  dashboard,
  geo,
  vocabularios,
  orgUnits,
} as const;
export type Messages = typeof messages;
