import React from "react";
import { AppIcon } from "@/shared/ui/AppIcon";
import { Check } from "lucide-react";

export interface StepMeta {
  label: string;
}

interface StepperHeaderProps {
  steps: StepMeta[];
  currentStep: number;
}

export const StepperHeader: React.FC<StepperHeaderProps> = ({ steps, currentStep }) => {
  const total = steps.length;
  const completed = currentStep - 1;
  const progressPct = Math.min(100, Math.round((completed / total) * 100));

  return (
    <div className="w-full mb-6">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold uppercase tracking-[0.14em] text-text-secondary">
          Paso {currentStep} de {total}
        </span>
        <span className="text-xs font-semibold text-text-secondary tabular-nums">
          {progressPct}% completado
        </span>
      </div>
      <div
        className="flex gap-1 w-full"
        role="progressbar"
        aria-valuenow={progressPct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progreso del asistente: paso ${currentStep} de ${total}`}
      >
        {steps.map((s, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <div
              key={s.label}
              className={`flex-1 h-1.5 rounded-full transition-colors duration-200 ${
                isDone ? "bg-secondary" : isCurrent ? "bg-primary" : "bg-border"
              }`}
              title={s.label}
            />
          );
        })}
      </div>
      <ol className="flex justify-between mt-2 list-none p-0 m-0">
        {steps.map((s, i) => {
          const stepNum = i + 1;
          const isDone = stepNum < currentStep;
          const isCurrent = stepNum === currentStep;
          return (
            <li
              key={s.label}
              className={`flex items-center gap-1.5 text-[0.7rem] uppercase tracking-[0.1em] font-bold transition-colors duration-200 ${
                isCurrent ? "text-primary" : isDone ? "text-secondary" : "text-text-secondary"
              }`}
              aria-current={isCurrent ? "step" : undefined}
            >
              <span
                className={`inline-flex items-center justify-center w-4.5 h-4.5 rounded-full text-[0.7rem] font-bold ${
                  isDone
                    ? "bg-secondary text-white"
                    : isCurrent
                      ? "bg-primary text-white"
                      : "bg-border text-text-secondary"
                }`}
              >
                {isDone ? <AppIcon icon={Check} size={9} strokeWidth={3} /> : stepNum}
              </span>
              <span className="hidden sm:inline">{s.label}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
};
