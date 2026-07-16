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
    <main className="main-content flex items-center justify-center p-8">
      <div className="w-full flex justify-center">
        <div
          className="w-full max-w-[520px] bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden pointer-events-none"
          aria-hidden="true"
        >
          <div className="p-6 pb-4 bg-gradient-to-b from-blue-50 to-white border-b border-gray-200">
            <SkeletonBlock className="skeleton skeleton-line skeleton-title-md" />
            <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
          </div>
          <div className="p-6">
            <div className="form flex flex-col gap-3.5">
              <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
              <SkeletonBlock className="skeleton skeleton-input" />
              <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
              <SkeletonBlock className="skeleton skeleton-input" />
              <SkeletonBlock className="skeleton skeleton-button" />
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);
