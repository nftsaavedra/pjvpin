import React from "react";

export type StatusChipVariant = "total" | "success" | "warning" | "info";

interface StatusChipProps {
  variant?: StatusChipVariant;
  className?: string;
  children: React.ReactNode;
  live?: boolean;
}

const VARIANT_CLASSES: Record<StatusChipVariant, string> = {
  total: "bg-blue-100 text-blue-700 border border-blue-200",
  success: "bg-green-100 text-green-700 border border-green-200",
  warning: "bg-amber-100 text-amber-700 border border-amber-200",
  info: "bg-blue-100 text-blue-700 border border-blue-200",
};

export const StatusChip: React.FC<StatusChipProps> = ({
  variant = "total",
  className,
  children,
  live = false,
}) => (
  <span
    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ""}`}
    {...(live ? { role: "status", "aria-live": "polite" } : {})}
  >
    {children}
  </span>
);
