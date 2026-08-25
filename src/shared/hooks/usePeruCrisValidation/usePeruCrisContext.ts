/**
 * Context + hook base para acceder al `PeruCrisValidationStore`.
 *
 * Aislado en `.ts` para cumplir `react-refresh/only-export-components`.
 * El Provider vive en `PeruCrisValidationProvider.tsx` (componente).
 */
import { createContext, useContext } from "react";
import type { PeruCrisValidationStore } from "./PeruCrisValidationStore";

export const PeruCrisValidationContext = createContext<PeruCrisValidationStore | null>(null);

/** Hook para acceder al store. Lanza error si no esta dentro del Provider. */
export function usePeruCrisValidation(): PeruCrisValidationStore {
  const store = useContext(PeruCrisValidationContext);
  if (!store) {
    throw new Error("usePeruCrisValidation() debe usarse dentro de <PeruCrisValidationProvider>.");
  }
  return store;
}
