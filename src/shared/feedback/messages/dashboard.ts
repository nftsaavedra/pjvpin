export const dashboard = {
  chartEmptyMessages: {
    rankingAsignaciones: "Sin asignaciones para el ranking",
    distribucion: "Sin datos de distribución",
    comparacion: "Sin datos para comparación",
    proyectosActivos: "Sin proyectos activos asignados",
    tendencia: "Sin datos de tendencia disponibles.",
    distribucionRenacyt: "Sin datos de distribución RENACYT disponibles.",
  } as const,
} as const;

export type DashboardMessageKey = keyof typeof dashboard;
