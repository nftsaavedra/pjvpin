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
} as const;

export type UiMessageKey = keyof typeof ui;
