import React from "react";
import { Badge, type BadgeVariant } from "./Badge";
import { FloatingTooltip } from "@/shared/overlays/FloatingTooltip";

/**
 * Badges inline: PURE (izquierda) + PeruCRIS (derecha).
 * Segun la matriz visual del doc WIREFRAMES_INDICADOR_VISUAL.md.
 */

export type PeruCrisVariant = "synced" | "differences" | "not_found" | "pending" | "unknown";

interface PeruCrisBadgeProps {
  variant: PeruCrisVariant;
  tooltip?: React.ReactNode;
  ariaLabel: string;
}

const PERUCRIS_LABEL: Record<PeruCrisVariant, string> = {
  synced: "PeruCRIS sincronizado",
  differences: "PeruCRIS con diferencias",
  not_found: "PeruCRIS no encontrado",
  pending: "PeruCRIS pendiente",
  unknown: "PeruCRIS sin validar",
};

const PERUCRIS_ICON: Record<PeruCrisVariant, string> = {
  synced: "\u2713",
  differences: "\u26A0",
  not_found: "\u2717",
  pending: "?",
  unknown: "?",
};

const PERUCRIS_VARIANT_BG: Record<PeruCrisVariant, BadgeVariant> = {
  synced: "success",
  differences: "info",
  not_found: "warning",
  pending: "default",
  unknown: "default",
};

export const PeruCrisBadge: React.FC<PeruCrisBadgeProps> = ({ variant, tooltip, ariaLabel }) => {
  const badge = <Badge variant={PERUCRIS_VARIANT_BG[variant]}>{PERUCRIS_ICON[variant]}</Badge>;
  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
    >
      {badge}
    </button>
  );

  if (!tooltip) {
    return (
      <span aria-label={ariaLabel} role="img">
        {badge}
      </span>
    );
  }
  return <FloatingTooltip content={tooltip} renderTrigger={() => trigger} />;
};

interface PureBadgeProps {
  variant: "synced" | "manual";
  tooltip?: React.ReactNode;
  ariaLabel: string;
}

const PURE_LABEL: Record<"synced" | "manual", string> = {
  synced: "Sincronizado con Pure",
  manual: "Cargado manualmente",
};

export const PureBadge: React.FC<PureBadgeProps> = ({ variant, tooltip, ariaLabel }) => {
  const variantClass: BadgeVariant = variant === "synced" ? "success" : "default";
  const badge = <Badge variant={variantClass}>PURE</Badge>;
  const trigger = (
    <button
      type="button"
      aria-label={ariaLabel}
      className="inline-flex items-center focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
    >
      {badge}
    </button>
  );
  if (!tooltip) {
    return (
      <span aria-label={ariaLabel} role="img">
        {badge}
      </span>
    );
  }
  return <FloatingTooltip content={tooltip} renderTrigger={() => trigger} />;
};

// ─── SyncBadge (combinado) ───────────────────────────────────────────────────

export interface SyncBadgeProps {
  pure: "synced" | "manual";
  perucris: PeruCrisVariant;
  perucrisItem?: import("@/shared/tauri/types/perucris.types").PeruCrisValidationItem;
  noValidableReason?: string;
}

export const SyncBadge: React.FC<SyncBadgeProps> = ({
  pure,
  perucris,
  perucrisItem,
  noValidableReason,
}) => {
  const perucrisTooltip = noValidableReason ? (
    <div className="space-y-1">
      <strong>{PERUCRIS_LABEL.unknown}</strong>
      <p className="text-xs text-gray-700">{noValidableReason}</p>
    </div>
  ) : perucrisItem ? (
    <PeruCrisTooltipContent item={perucrisItem} />
  ) : (
    <div className="text-xs">Sin validar en cache.</div>
  );

  return (
    <span className="inline-flex items-center gap-1">
      <PureBadge
        variant={pure}
        tooltip={<div className="text-xs">{PURE_LABEL[pure]}</div>}
        ariaLabel={`PURE ${PURE_LABEL[pure]}`}
      />
      <PeruCrisBadge
        variant={perucris}
        tooltip={perucrisTooltip}
        ariaLabel={`PeruCRIS ${PERUCRIS_LABEL[perucris]}`}
      />
    </span>
  );
};

const PeruCrisTooltipContent: React.FC<{
  item: import("@/shared/tauri/types/perucris.types").PeruCrisValidationItem;
}> = ({ item }) => (
  <div className="space-y-1 max-w-xs">
    <strong>PeruCRIS · {item.encontradoEnPeruCris ? "Sincronizado" : "No encontrado"}</strong>
    {item.peruCrisUuid && (
      <p className="text-xs">
        <span className="font-medium">UUID:</span>{" "}
        <code className="text-xs">{item.peruCrisUuid}</code>
      </p>
    )}
    {item.peruCrisHandle && (
      <p className="text-xs">
        <span className="font-medium">Handle:</span> {item.peruCrisHandle}
      </p>
    )}
    {item.lastModifiedPeruCris && (
      <p className="text-xs">
        <span className="font-medium">Ultima modificacion:</span> {item.lastModifiedPeruCris}
      </p>
    )}
    {item.diferencias.length > 0 && (
      <ul className="text-xs text-amber-800 list-disc pl-4">
        {item.diferencias.map((d, i) => (
          <li key={i}>{d}</li>
        ))}
      </ul>
    )}
  </div>
);
