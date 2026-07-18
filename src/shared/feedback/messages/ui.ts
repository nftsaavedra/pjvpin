export const ui = {
  sinDatos: "Sin datos para mostrar.",
  sinResultados: "Sin resultados.",
  cargando: "Cargando...",
  reintentar: "Reintentar",
  cancelar: "Cancelar",
  confirmar: "Confirmar",
  guardar: "Guardar",
  error: "Error",
  errorInesperado: "Ocurrió un error inesperado.",
  modoConsulta: "Modo consulta: solo lectura.",
  errorConDetalle: (msg: string) => `Error: ${msg}`,
  statusActivo: "Activo",
  statusInactivo: "Inactivo",
  noDisponible: "No disponible",
  emptyState: (entidad: string) => `No hay ${entidad} registrados.`,
  filteredEmpty: (entidad: string) => `No se encontraron ${entidad} con los filtros aplicados.`,
  errorCarga: (entidad: string) => `No se pudieron cargar los ${entidad}.`,
  emptyStateCtas: {
    limpiarFiltros: "Limpiar filtros",
  },
} as const;

export type UiMessageKey = keyof typeof ui;
