/**
 * Funciones puras (variantes) para los badges de sincronizacion
 * (PURE + PeruCRIS). Aisladas en `.ts` (sin JSX) para cumplir
 * `react-refresh/only-export-components` de eslint-plugin-react-refresh.
 */
import type { PeruCrisValidationItem } from "@/shared/api/types/perucris.types";
import type { PeruCrisVariant } from "./SyncBadge";

export function pureBadgeVariant(dominioOrigen?: string | null): "synced" | "manual" {
  return dominioOrigen === "PURE" ? "synced" : "manual";
}

export function peruCrisBadgeVariant(
  peruCrisItem: PeruCrisValidationItem | undefined,
  cacheValid: boolean,
  opts: { hasOrcid?: boolean; isPatent?: boolean } = {},
): PeruCrisVariant {
  if (opts.isPatent) return "unknown";
  if (opts.hasOrcid === false) return "unknown";
  if (!peruCrisItem) {
    return cacheValid ? "unknown" : "pending";
  }
  if (!peruCrisItem.encontrado_en_perucris) return "not_found";
  if (peruCrisItem.diferencias.length > 0) return "differences";
  return "synced";
}
