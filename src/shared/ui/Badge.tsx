import React from "react";

export type BadgeVariant = "default" | "info" | "success" | "warning";

interface BadgeProps {
  variant?: BadgeVariant;
  className?: string;
  children: React.ReactNode;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  default: "bg-blue-100 text-blue-600",
  info: "bg-blue-100 text-blue-700",
  success: "bg-green-100 text-green-600",
  warning: "bg-amber-100 text-amber-800",
};

export const Badge: React.FC<BadgeProps> = ({ variant = "default", className, children }) => (
  <span
    className={`inline-block px-3 py-1 rounded-full font-semibold text-sm ${VARIANT_CLASSES[variant]}${className ? ` ${className}` : ""}`}
  >
    {children}
  </span>
);
