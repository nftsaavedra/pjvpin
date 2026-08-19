import React from "react";
import { ChevronLeft } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";

interface StepFooterProps {
  onBack?: () => void;
  backLabel?: string;
  primaryLabel: string;
  primaryDisabled?: boolean;
  primaryLoading?: boolean;
  onPrimary?: () => void;
  primaryType?: "button" | "submit";
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export const StepFooter: React.FC<StepFooterProps> = ({
  onBack,
  backLabel,
  primaryLabel,
  primaryDisabled = false,
  primaryLoading = false,
  onPrimary,
  primaryType = "button",
  secondaryAction,
}) => (
  <div className="flex items-center justify-between gap-3 pt-4 border-t border-border">
    {onBack ? (
      <button
        type="button"
        className="btn-secondary shrink-0"
        onClick={onBack}
        aria-label={backLabel}
      >
        <span className="button-with-icon">
          <AppIcon icon={ChevronLeft} size={16} />
          <span>{backLabel ?? "Atrás"}</span>
        </span>
      </button>
    ) : (
      <span />
    )}
    <div className="flex items-center gap-2 ml-auto">
      {secondaryAction && (
        <button type="button" className="btn-secondary" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </button>
      )}
      <button
        type={primaryType}
        className="btn-primary"
        disabled={primaryDisabled || primaryLoading}
        onClick={() => {
          if (primaryType === "button" && onPrimary) onPrimary();
        }}
      >
        {primaryLoading ? "Procesando…" : primaryLabel}
      </button>
    </div>
  </div>
);
