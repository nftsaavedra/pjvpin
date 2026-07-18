import { ui } from "./ui";
import { auth } from "./auth";
import { wizard } from "./wizard";

export { ui, type UiMessageKey } from "./ui";
export { auth, type AuthMessageKey } from "./auth";
export { wizard, type WizardMessageKey } from "./wizard";

export const messages = { ui, auth, wizard } as const;
export type Messages = typeof messages;
