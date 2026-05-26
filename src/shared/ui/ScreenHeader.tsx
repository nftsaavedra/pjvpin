import React from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { AppIcon } from "./AppIcon";

interface ScreenHeaderProps {
  parentLabel: string;
  currentLabel: string;
  onBack: () => void;
  isLoading?: boolean;
  submitLabel: string;
  submitIcon: LucideIcon;
  onSubmit: () => void;
  submitDisabled?: boolean;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  parentLabel,
  currentLabel,
  onBack,
  isLoading = false,
  submitLabel,
  submitIcon: SubmitIcon,
  onSubmit,
  submitDisabled = false,
}) => (
  <div className="screen-header">
    <div className="screen-header-left">
      <div className="screen-breadcrumb">
        <button
          type="button"
          className="screen-breadcrumb-back"
          onClick={onBack}
          aria-label={`Volver a ${parentLabel}`}
        >
          <AppIcon icon={ArrowLeft} size={14} />
        </button>
        <span>{parentLabel}</span>
        <span className="screen-breadcrumb-sep">/</span>
        <span className="screen-breadcrumb-current">{currentLabel}</span>
      </div>
    </div>
    <div className="screen-header-right">
      <button type="button" className="btn-secondary" onClick={onBack} disabled={isLoading}>
        Cancelar
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={onSubmit}
        disabled={submitDisabled || isLoading}
      >
        <span className="button-with-icon">
          <AppIcon icon={SubmitIcon} size={18} />
          <span>{submitLabel}</span>
        </span>
      </button>
    </div>
  </div>
);
