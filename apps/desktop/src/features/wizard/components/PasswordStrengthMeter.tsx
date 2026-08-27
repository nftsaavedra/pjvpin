import React from "react";
import { Check } from "lucide-react";
import { AppIcon } from "@/shared/ui/AppIcon";

interface Requirement {
  test: (value: string) => boolean;
  label: string;
}

interface PasswordStrengthMeterProps {
  value: string;
  requirements: Requirement[];
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({
  value,
  requirements,
}) => {
  const met = requirements.filter((r) => r.test(value)).length;
  const total = requirements.length;
  const allMet = met === total && total > 0;

  const tone = allMet
    ? { bar: "bg-emerald-500", label: "text-emerald-700", text: "Contraseña segura" }
    : value.length === 0
      ? { bar: "bg-border", label: "text-text-secondary", text: "Define una contraseña" }
      : met >= 3
        ? { bar: "bg-amber-500", label: "text-amber-700", text: "Casi lista" }
        : { bar: "bg-red-500", label: "text-red-700", text: "Aún falta" };

  const segments = Array.from({ length: total }, (_, i) => i < met);

  return (
    <div className="rounded-xl px-4 py-3.5 bg-bg border border-border" aria-live="polite">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[0.7rem] font-bold uppercase tracking-[0.12em] text-text-secondary">
          Requisitos
        </span>
        <span className={`text-xs font-bold ${tone.label}`}>
          {met}/{total} · {tone.text}
        </span>
      </div>
      <div className="flex gap-1 mb-3" aria-hidden="true">
        {segments.map((filled, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors duration-200 ${
              filled ? tone.bar : "bg-border"
            }`}
          />
        ))}
      </div>
      <ul className="list-none p-0 m-0 flex flex-col gap-1.5">
        {requirements.map((r) => {
          const isMet = r.test(value);
          return (
            <li
              key={r.label}
              className={`flex items-center gap-2 text-sm transition-colors duration-200 ${
                isMet ? "text-secondary font-semibold" : "text-text-secondary"
              }`}
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 transition-colors duration-200 ${
                  isMet ? "bg-emerald-100 text-emerald-700" : "bg-border text-text-secondary"
                }`}
                aria-hidden="true"
              >
                {isMet ? <AppIcon icon={Check} size={10} strokeWidth={3} /> : null}
              </span>
              <span>{r.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
