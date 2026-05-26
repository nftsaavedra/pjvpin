import React from "react";
import { BookOpen } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { SkeletonBlock } from "@/shared/ui/Skeleton";

interface AppLoadingScreenProps {
  subtitle: string;
}

export const AppLoadingScreen: React.FC<AppLoadingScreenProps> = ({ subtitle }) => (
  <div className="app-container">
    <header className="app-header">
      <div className="header-content">
        <div>
          <h1 className="app-title title-with-icon">
            <AppIcon icon={BookOpen} size={24} />
            <span>UPI Research</span>
          </h1>
          <p className="app-subtitle">{subtitle}</p>
        </div>
      </div>
    </header>
    <main className="main-content auth-main">
      <div className="auth-shell">
        <div className="auth-card auth-card-loading" aria-hidden="true">
          <div className="auth-card-header">
            <SkeletonBlock className="skeleton skeleton-line skeleton-title-md" />
            <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
          </div>
          <div className="form auth-loading-form">
            <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
            <SkeletonBlock className="skeleton skeleton-input" />
            <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
            <SkeletonBlock className="skeleton skeleton-input" />
            <SkeletonBlock className="skeleton skeleton-button" />
          </div>
        </div>
      </div>
    </main>
  </div>
);
