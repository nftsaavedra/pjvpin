import React, { Fragment } from "react";
import type { LucideIcon } from "lucide-react";
import { FloatingTooltip } from "../overlays/FloatingTooltip";
import { AppIcon } from "../ui/AppIcon";

export type TabGroup = "operativa" | "sistema";

export interface Tab {
  id: string;
  label: string;
  icon?: LucideIcon;
  description?: string;
  group?: TabGroup;
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
      {tabs.map((tab, idx) => {
        const tabAriaLabel =
          collapsed && tab.description ? `${tab.label}. ${tab.description}` : tab.label;

        const showGroupDivider =
          variant === "sidebar" &&
          tab.group === "sistema" &&
          (idx === 0 || tabs[idx - 1]?.group !== "sistema");

        const groupLabelId = showGroupDivider
          ? `tab-nav-group-${tab.group ?? "sistema"}`
          : undefined;

        const tabNode =
          variant === "sidebar" && collapsed ? (
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
          ) : (
            <button
              key={tab.id}
              type="button"
              className={`${buttonClass} ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => {
                onTabChange(tab.id);
              }}
              aria-current={activeTab === tab.id ? "page" : undefined}
              role={variant === "settings" ? "tab" : undefined}
              aria-selected={variant === "settings" ? activeTab === tab.id : undefined}
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

        if (!showGroupDivider) {
          return tabNode;
        }

        return (
          <Fragment key={tab.id}>
            <div
              className="tab-nav-group-divider flex w-full items-center gap-2 px-3 py-2 text-text-secondary"
              aria-hidden={collapsed ? "true" : undefined}
              role={collapsed ? undefined : "separator"}
              aria-orientation="horizontal"
            >
              <span className="h-px flex-1 bg-border" />
              {!collapsed && (
                <span
                  id={groupLabelId}
                  className="text-[0.7rem] font-semibold uppercase tracking-[0.16em]"
                >
                  Sistema
                </span>
              )}
              {!collapsed && <span className="h-px w-3 bg-border" />}
            </div>
            {tabNode}
          </Fragment>
        );
      })}
    </nav>
  );
};
