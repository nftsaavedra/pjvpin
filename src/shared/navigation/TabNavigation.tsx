import React from "react";
import type { LucideIcon } from "lucide-react";
import { FloatingTooltip } from "../overlays/FloatingTooltip";
import { AppIcon } from "../ui/AppIcon";

export interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
}

interface TabNavigationProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: "topbar" | "sidebar" | "settings";
  collapsed?: boolean;
  ariaLabel?: string;
}

export const TabNavigation: React.FC<TabNavigationProps> = ({
  tabs,
  activeTab,
  onTabChange,
  variant = "topbar",
  collapsed = false,
  ariaLabel,
}) => {
  const navClass =
    variant === "settings"
      ? "tab-navigation-settings"
      : `tab-navigation tab-navigation-${variant}${collapsed ? " is-collapsed" : ""}`;
  const buttonClass = variant === "settings" ? "tab-button-settings" : "tab-button";

  return (
    <nav
      className={navClass}
      role={variant === "settings" ? "tablist" : undefined}
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const tabAriaLabel =
          collapsed && tab.description ? `${tab.label}. ${tab.description}` : tab.label;

        if (variant === "sidebar" && collapsed) {
          return (
            <FloatingTooltip
              key={tab.id}
              content={tab.label}
              size="sm"
              placement="right"
              offsetValue={12}
              renderTrigger={({ ref, triggerProps }) => (
                <button
                  type="button"
                  ref={ref}
                  {...triggerProps}
                  className={`${buttonClass} ${activeTab === tab.id ? "active" : ""}`}
                  onClick={() => {
                    onTabChange(tab.id);
                  }}
                  aria-current={activeTab === tab.id ? "page" : undefined}
                  aria-label={tabAriaLabel}
                >
                  {tab.icon && (
                    <span className="tab-icon">
                      <AppIcon icon={tab.icon} size={18} />
                    </span>
                  )}
                  <span className="tab-button-copy">
                    <span className="tab-button-label">{tab.label}</span>
                    {tab.description && (
                      <span className="tab-button-description">{tab.description}</span>
                    )}
                  </span>
                </button>
              )}
            />
          );
        }

        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            type="button"
            className={`${buttonClass} ${isActive ? "active" : ""}`}
            onClick={() => {
              onTabChange(tab.id);
            }}
            aria-current={isActive ? "page" : undefined}
            role={variant === "settings" ? "tab" : undefined}
            aria-selected={variant === "settings" ? isActive : undefined}
            aria-label={tabAriaLabel}
          >
            {tab.icon && (
              <span className={variant === "settings" ? "tab-button-settings-icon" : "tab-icon"}>
                <AppIcon icon={tab.icon} size={16} />
              </span>
            )}
            <span
              className={variant === "settings" ? "tab-button-settings-copy" : "tab-button-copy"}
            >
              <span
                className={
                  variant === "settings" ? "tab-button-settings-label" : "tab-button-label"
                }
              >
                {tab.label}
              </span>
              {tab.description && (
                <span
                  className={
                    variant === "settings"
                      ? "tab-button-settings-description"
                      : "tab-button-description"
                  }
                >
                  {tab.description}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
