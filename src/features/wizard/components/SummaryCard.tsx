import React from "react";

interface SummaryField {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}

interface SummaryCardProps {
  title: string;
  fields: SummaryField[];
}

export const SummaryCard: React.FC<SummaryCardProps> = ({ title, fields }) => (
  <section
    className="rounded-xl border border-border overflow-hidden"
    aria-labelledby={`summary-${title}`}
  >
    <header className="px-4 py-2.5 bg-bg border-b border-border">
      <h3
        id={`summary-${title}`}
        className="text-xs font-bold uppercase tracking-[0.12em] text-text-secondary m-0"
      >
        {title}
      </h3>
    </header>
    <dl className="divide-y divide-border m-0">
      {fields.map((f) => (
        <div
          key={f.label}
          className="flex items-baseline justify-between gap-4 px-4 py-2.5 text-sm"
        >
          <dt className="text-text-secondary shrink-0">{f.label}</dt>
          <dd
            className={`text-right min-w-0 break-words text-text-primary ${
              f.mono ? "font-mono text-xs" : "font-medium"
            }`}
          >
            {f.value}
          </dd>
        </div>
      ))}
    </dl>
  </section>
);
