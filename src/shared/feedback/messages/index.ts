import { ui } from "./ui";
import { auth } from "./auth";
import { wizard } from "./wizard";
import { investigadores } from "./investigadores";

export { ui, type UiMessageKey } from "./ui";
export { auth, type AuthMessageKey } from "./auth";
export { wizard, type WizardMessageKey } from "./wizard";
export { investigadores, type InvestigadoresMessageKey } from "./investigadores";

export const messages = { ui, auth, wizard, investigadores } as const;
export type Messages = typeof messages;
