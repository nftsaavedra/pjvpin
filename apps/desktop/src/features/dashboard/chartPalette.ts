/**
 * Single source of truth for chart series colors in the Panel (Dashboard) feature.
 * recharts cannot read CSS custom properties directly, so colors are mirrored here
 * from `src/assets/styles/tokens.css`. Keep in sync with DESIGN.md token changes.
 *
 * Source tokens:
 *  - palette.primary    -> --primary-color   (#3b82f6)
 *  - palette.secondary  -> --secondary-color (#10b981)
 *  - palette.warning    -> --warning-color   (#f59e0b)
 *  - palette.textMuted  -> --text-secondary  (#556274 / tick labels)
 *  - palette.grid       -> #dbe7f5           (grid lines, derived from --primary-light)
 *  - palette.surface    -> #ffffff           (cell stroke)
 *  - palette.seriesInfo -> #0ea5e9           (sky-500 — secondary series, documented in DESIGN.md)
 *  - palette.seriesAccent -> #6366f1         (indigo-500 — tertiary series, documented in DESIGN.md)
 */

export const chartPalette = {
  primary: "#3b82f6",
  secondary: "#10b981",
  warning: "#f59e0b",
  seriesInfo: "#0ea5e9",
  seriesAccent: "#6366f1",
  textMuted: "#64748b",
  grid: "#dbe7f5",
  surface: "#ffffff",
} as const;

export type ChartPaletteKey = keyof typeof chartPalette;
