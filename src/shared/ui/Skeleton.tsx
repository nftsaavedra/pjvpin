import React from "react";

interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className = "" }) => (
  <div className={`skeleton ${className}`.trim()} aria-hidden="true" />
);

interface RefreshHintProps {
  refreshing?: boolean;
  label?: string;
}

export const RefreshHint: React.FC<RefreshHintProps> = ({
  refreshing = false,
  label = "Actualizando datos",
}) => {
  if (!refreshing) return null;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-700 border border-blue-200 text-xs font-bold"
      role="status"
      aria-live="polite"
    >
      <span className="w-2 h-2 rounded-full bg-current animate-pulse" />
      {label}
    </div>
  );
};

interface SkeletonTableProps {
  columns: number;
  rows?: number;
}

export const SkeletonTable: React.FC<SkeletonTableProps> = ({ columns, rows = 5 }) => (
  <div
    className="skeleton-table"
    aria-hidden="true"
    style={{ ["--skeleton-columns" as string]: columns }}
  >
    <div className="skeleton-table-header">
      {Array.from({ length: columns }).map((_, index) => (
        <SkeletonBlock
          key={`header-${index}`}
          className="skeleton skeleton-table-cell skeleton-table-head"
        />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={`row-${rowIndex}`} className="skeleton-table-row">
        {Array.from({ length: columns }).map((__, columnIndex) => (
          <SkeletonBlock
            key={`cell-${rowIndex}-${columnIndex}`}
            className="skeleton skeleton-table-cell"
          />
        ))}
      </div>
    ))}
  </div>
);

export const SkeletonKpiGrid: React.FC = () => (
  <div className="kpi-grid skeleton-kpi-grid" aria-hidden="true">
    {Array.from({ length: 4 }).map((_, index) => (
      <div key={`kpi-${index}`} className="kpi-card skeleton-kpi-card">
        <SkeletonBlock className="skeleton skeleton-circle" />
        <div className="kpi-content">
          <SkeletonBlock className="skeleton skeleton-line skeleton-line-strong" />
          <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
        </div>
      </div>
    ))}
  </div>
);

interface SkeletonChartProps {
  titleWidth?: "sm" | "md" | "lg";
  height?: "sm" | "md" | "lg";
}

export const SkeletonChart: React.FC<SkeletonChartProps> = ({
  titleWidth = "md",
  height = "md",
}) => (
  <div className="chart-container skeleton-chart-card" aria-hidden="true">
    <SkeletonBlock className={`skeleton skeleton-line skeleton-title-${titleWidth}`} />
    <SkeletonBlock className={`skeleton skeleton-chart skeleton-chart-${height}`} />
  </div>
);

export const SkeletonChecklist: React.FC = () => (
  <div className="form-group" aria-hidden="true">
    <label>Seleccionar Investigadores *</label>
    <div className="investigadores-checklist skeleton-checklist">
      {Array.from({ length: 5 }).map((_, index) => (
        <div
          key={`investigador-skeleton-${index}`}
          className="checkbox-item skeleton-checkbox-item"
        >
          <SkeletonBlock className="skeleton skeleton-checkbox" />
          <SkeletonBlock className="skeleton skeleton-line skeleton-line-soft" />
        </div>
      ))}
    </div>
  </div>
);
