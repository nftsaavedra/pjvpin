export const vocabularios = {
  titulo: "Vocabularios CONCYTEC",
  seleccionarEsquema: "Seleccionar esquema",
  esquemaLabel: "Esquema",
  reimportar: "Reimportar",
  reimportarEsquema: (esquema: string) => `Reimportar ${esquema}`,
  confirmarReimportar: (esquema: string) =>
    `¿Reimportar el vocabulario "${esquema}"? Se restaurarán los valores oficiales CONCYTEC.`,
  reimportadoOK: "Vocabulario reimportado correctamente",
  sinItems: "Sin items para este esquema.",
  sinEsquemas: "Sin vocabularios disponibles.",
  sinSubItems: "Sin sub-items.",
  cargandoItems: "Cargando items...",
  cargandoEsquemas: "Cargando vocabularios...",
  errorCarga: "No se pudieron cargar los vocabularios.",
  colCodigo: "Código SKOS",
  colNombre: "Nombre",
  colNivel: "Nivel",
  nivel: (nivel: number) => `Nivel ${nivel}`,
  oficialConcytec: "Oficial CONCYTEC",
  expandir: "Mostrar sub-items",
  contraer: "Ocultar sub-items",
  selectAriaLabel: "Seleccionar esquema CONCYTEC",
  tableAriaLabel: (esquema: string) => `Items del vocabulario ${esquema}`,
} as const;

export type VocabulariosMessageKey = keyof typeof vocabularios;
