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
} as const;

export type UiMessageKey = keyof typeof ui;
