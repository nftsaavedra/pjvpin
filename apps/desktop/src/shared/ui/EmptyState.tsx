import React from "react";
import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, SearchX } from "lucide-react";
import { AppIcon } from "./AppIcon";

export type EmptyStateVariant = "empty" | "filtered" | "error";

interface EmptyStateProps {
  variant: EmptyStateVariant;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: LucideIcon;
  "data-testid"?: string;
}

const VARIANT_ICON: Record<EmptyStateVariant, LucideIcon> = {
  empty: Inbox,
  filtered: SearchX,
  error: AlertCircle,
};

const VARIANT_ICON_CLASS: Record<EmptyStateVariant, string> = {
  empty: "text-gray-400",
  filtered: "text-blue-500",
  error: "text-amber-500",
};

const VARIANT_ACTION_CLASS: Record<EmptyStateVariant, string> = {
  empty: "btn-primary",
  filtered: "btn-secondary",
  error: "btn-primary",
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  variant,
  message,
  actionLabel,
  onAction,
  icon,
  "data-testid": testId,
}) => {
  const Icon = icon ?? VARIANT_ICON[variant];
  const showAction = Boolean(actionLabel && onAction);

  return (
    <div
      className="empty-state"
      data-testid={testId}
      role={variant === "error" ? "alert" : "status"}
    >
      <AppIcon icon={Icon} size={36} className={VARIANT_ICON_CLASS[variant]} />
      <p className="m-0">{message}</p>
      {showAction && (
        <button type="button" className={VARIANT_ACTION_CLASS[variant]} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};
