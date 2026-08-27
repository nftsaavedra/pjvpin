import React from "react";
import { AppIcon } from "@/shared/ui/AppIcon";
import type { LucideIcon } from "lucide-react";

interface StepHeaderProps {
  icon: LucideIcon;
  title: string;
  description?: string;
}

export const StepHeader: React.FC<StepHeaderProps> = ({ icon, title, description }) => (
  <header className="flex items-start gap-4 px-6 pt-6 pb-5 border-b border-border">
    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary-light text-primary shrink-0">
      <AppIcon icon={icon} size={20} strokeWidth={2} />
    </div>
    <div className="flex flex-col gap-1 min-w-0">
      <h1 className="text-xl font-bold text-text-primary leading-tight m-0">{title}</h1>
      {description && (
        <p className="text-sm text-text-secondary leading-snug m-0 mt-0.5">{description}</p>
      )}
    </div>
  </header>
);
