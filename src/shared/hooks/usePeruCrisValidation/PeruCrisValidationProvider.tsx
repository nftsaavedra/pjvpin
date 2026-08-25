/**
 * Provider del store de validacion PeruCRIS.
 *
 * Solo este archivo es `.tsx` (contiene un componente). La clase del store
 * y los hooks viven en archivos `.ts` separados para cumplir
 * `react-refresh/only-export-components`.
 */
import React, { useMemo } from "react";
import { PeruCrisValidationStore } from "./PeruCrisValidationStore";
import { PeruCrisValidationContext } from "./usePeruCrisContext";

export interface PeruCrisValidationProviderProps {
  children: React.ReactNode;
  ttlMs?: number;
  maxEntries?: number;
}

export const PeruCrisValidationProvider: React.FC<PeruCrisValidationProviderProps> = ({
  children,
  ttlMs,
  maxEntries,
}) => {
  const store = useMemo(
    () => new PeruCrisValidationStore({ ttlMs, maxEntries }),
    // El store se crea UNA sola vez por montaje del Provider; intencional.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  return (
    <PeruCrisValidationContext.Provider value={store}>
      {children}
    </PeruCrisValidationContext.Provider>
  );
};
