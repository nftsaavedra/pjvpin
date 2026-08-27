import { useCallback, useState } from "react";
import {
  enviarAPeruCris,
  validarAPeruCris,
  type PeruCrisPushResult,
} from "@/features/reportes/api";
import type { PeruCrisValidationReport, PeruCrisValidationScope } from "@/features/reportes/api";
import { getTauriErrorMessage } from "@/shared/tauri/error";

/** Estado del flujo combinado push + validar. */
export type PeruCrisSyncState =
  | { fase: "idle" }
  | { fase: "pushing" }
  | { fase: "validating" }
  | { fase: "error"; message: string }
  | {
      fase: "ok";
      push: PeruCrisPushResult | null;
      validation: PeruCrisValidationReport | null;
      validatedAt: number;
    };

/**
 * Hook para gestionar el ciclo push + validar contra PeruCRIS.
 * Mantiene el ultimo resultado en memoria.
 */
export function useEnviarPeruCris() {
  const [state, setState] = useState<PeruCrisSyncState>({ fase: "idle" });

  const enviar = useCallback(async () => {
    setState({ fase: "pushing" });
    try {
      const push = await enviarAPeruCris();
      setState((prev) => {
        const validation = prev.fase === "ok" ? prev.validation : null;
        return {
          fase: "ok",
          push,
          validation,
          validatedAt: prev.fase === "ok" ? prev.validatedAt : Date.now(),
        };
      });
    } catch (err) {
      setState({ fase: "error", message: getTauriErrorMessage(err) });
    }
  }, []);

  const validar = useCallback(async (scope: PeruCrisValidationScope = "todo") => {
    setState({ fase: "validating" });
    try {
      const validation = await validarAPeruCris(scope);
      setState((prev) => {
        const push = prev.fase === "ok" ? prev.push : null;
        return {
          fase: "ok",
          push,
          validation,
          validatedAt: Date.now(),
        };
      });
    } catch (err) {
      setState({ fase: "error", message: getTauriErrorMessage(err) });
    }
  }, []);

  const reset = useCallback(() => {
    setState({ fase: "idle" });
  }, []);

  return { state, enviar, validar, reset };
}
