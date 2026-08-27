import React from "react";
import { ArrowLeft, type LucideIcon } from "lucide-react";
import { AppIcon } from "./AppIcon";
import { messages } from "@/shared/feedback/messages";

interface ScreenHeaderProps {
  parentLabel: string;
  currentLabel: string;
  description?: string;
  titleIcon?: LucideIcon;
  onBack: () => void;
}

export const ScreenHeader: React.FC<ScreenHeaderProps> = ({
  parentLabel,
  currentLabel,
  description,
  titleIcon: TitleIcon,
  onBack,
}) => (
  <header className="screen-header">
    <nav className="screen-breadcrumb" aria-label={messages.shared.navigation.volverA(parentLabel)}>
      <button
        type="button"
        className="screen-breadcrumb-back"
        onClick={onBack}
        aria-label={messages.shared.navigation.volverA(parentLabel)}
      >
        <AppIcon icon={ArrowLeft} size={14} />
      </button>
      <span>{parentLabel}</span>
      <span className="screen-breadcrumb-sep" aria-hidden="true">
        /
      </span>
      <span className="screen-breadcrumb-current" aria-current="page">
        {currentLabel}
      </span>
    </nav>
    <div className="screen-header-title">
      <h1 className="screen-title">
        {TitleIcon && (
          <span className="screen-title-icon" aria-hidden="true">
            <AppIcon icon={TitleIcon} size={20} />
          </span>
        )}
        <span>{currentLabel}</span>
      </h1>
      {description && <p className="screen-header-description">{description}</p>}
    </div>
  </header>
);
