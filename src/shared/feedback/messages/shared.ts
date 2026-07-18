export const shared = {
  dataTableEmptyDefault: "No hay datos para mostrar",
  errorBoundaryTitleDefault: "Error inesperado",
  errorBoundaryMessageDefault: "Ocurrio un error al cargar esta seccion.",
} as const;

export type SharedMessageKey = keyof typeof shared;
