/**
 * Hook que dispara validacion batch contra PeruCRIS al montarse y cuando
 * `trigger` cambia. Cachea los resultados en el store.
 *
 * Aislado en `.ts` (sin JSX) para cumplir `react-refresh/only-export-components`.
 */
import { useEffect, useState } from "react";
import { usePeruCrisValidation } from "./usePeruCrisContext";
import type { PeruCrisValidationScope } from "@/shared/tauri/types/perucris.types";

export function usePeruCrisBatchValidation(
  scope: "todo" | PeruCrisValidationScope,
  trigger: number,
): { loading: boolean; error: string | null } {
  const store = usePeruCrisValidation();
  const [phase, setPhase] = useState<{ loading: boolean; error: string | null }>({
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    // Nota: NO marcamos `loading:true` aqui — el fetch es rapido y la UI
    // muestra el estado anterior (loading:false del ciclo previo) hasta
    // que termine. Evita el warning de "setState synchronously in effect".

    void (async () => {
      try {
        const { validarAPeruCris } = await import("@/shared/tauri/perucris");
        const report = await validarAPeruCris(scope);
        // `cancelled` cambia entre awaits (cleanup); el compilador no ve
        // el set async. Falso positivo esperado por `no-unnecessary-condition`.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (cancelled) return;
        store.setAll(report.items);
        setPhase({ loading: false, error: null });
      } catch (err) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : String(err);
        console.warn(`[PeruCris] Batch validation failed (${scope}):`, msg);
        setPhase({ loading: false, error: msg });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [scope, trigger, store]);

  return { loading: phase.loading, error: phase.error };
}
