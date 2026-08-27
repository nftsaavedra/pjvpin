/**
 * Hook que expone una funcion para re-validar un id especifico y actualizar
 * el cache del store.
 *
 * Aislado en `.ts` (sin JSX) para cumplir `react-refresh/only-export-components`.
 */
import { useMemo, useState } from "react";
import { usePeruCrisValidation } from "./usePeruCrisContext";

export function usePeruCrisSingleValidation(): {
  validating: boolean;
  error: string | null;
  validar: (idLocal: string, tipo: "orgunit" | "publication") => Promise<void>;
} {
  const store = usePeruCrisValidation();
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validar = useMemo(
    () => async (idLocal: string, tipo: "orgunit" | "publication") => {
      setValidating(true);
      setError(null);
      try {
        const { validarOrgUnitPeruCris, validarPublicacionPeruCris } =
          await import("@/shared/tauri/perucris");
        const item =
          tipo === "orgunit"
            ? await validarOrgUnitPeruCris(idLocal)
            : await validarPublicacionPeruCris(idLocal);
        store.set(idLocal, item);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(msg);
        console.warn(`[PeruCris] Single validation failed (${idLocal}):`, msg);
      } finally {
        setValidating(false);
      }
    },
    [store],
  );

  return { validating, error, validar };
}
