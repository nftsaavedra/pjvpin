import { ui } from "./ui";
import { auth } from "./auth";
import { wizard } from "./wizard";
import { investigadores } from "./investigadores";
import { proyectos } from "./proyectos";
import { grupos } from "./grupos";
import { reportes } from "./reportes";
import { shared } from "./shared";

export { ui, type UiMessageKey } from "./ui";
export { auth, type AuthMessageKey } from "./auth";
export { wizard, type WizardMessageKey } from "./wizard";
export { investigadores, type InvestigadoresMessageKey } from "./investigadores";
export { proyectos, type ProyectosMessageKey } from "./proyectos";
export { grupos, type GruposMessageKey } from "./grupos";
export { reportes, type ReportesMessageKey } from "./reportes";
export { shared, type SharedMessageKey } from "./shared";

export const messages = {
  ui,
  auth,
  wizard,
  investigadores,
  proyectos,
  grupos,
  reportes,
  shared,
} as const;
export type Messages = typeof messages;
