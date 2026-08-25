export const dashboard = {
  chartEmptyMessages: {
    rankingAsignaciones: "Sin asignaciones para el ranking",
    distribucion: "Sin datos de distribución",
    comparacion: "Sin datos para comparación",
    proyectosActivos: "Sin proyectos activos asignados",
    tendencia: "Sin datos de tendencia disponibles.",
    distribucionRenacyt: "Sin datos de distribución RENACYT disponibles.",
  } as const,
  kpiLabels: {
    totalInvestigadores: "Investigadores",
    totalProyectos: "Proyectos",
    investigadoresSinProyectos: "Investigadores sin proyectos",
    promedioProyectos: "Promedio de proyectos por investigador",
  } as const,
  insightLabels: {
    porcentajeConProyectos: "Investigadores con proyectos",
    mayorCarga: (cantidad: number) =>
      `Mayor carga: ${cantidad} proyecto${cantidad === 1 ? "" : "s"}`,
  } as const,
  actions: {
    actualizar: "Actualizar",
    refreshing: "Actualizando indicadores del panel",
  } as const,
  errorCarga: "No se pudieron cargar los indicadores del panel.",
  loadError: "Error al cargar datos del panel",
} as const;

export type DashboardMessageKey = keyof typeof dashboard;
