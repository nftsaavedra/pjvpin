export const grupos = {
  sectionTitle: "Grupos de Investigación",
  breadcrumb: "Grupos de Investigación",
  nuevoGrupo: "Nuevo grupo",
  modoConsulta: "Modo consulta: solo lectura de grupos.",
  searchPlaceholder: "Buscar por nombre o coordinador...",
  contador: (count: number) => `${count} grupos`,
  coordinador: (nombre: string) => `Coordinador: ${nombre}`,
  sinCoordinador: "Sin coordinador asignado",
  lineasInvestigacionTitulo: "Líneas de investigación:",
  sinLineasRegistradas: "Sin líneas registradas",
  editarTitle: "Editar grupo",
  eliminarTitle: "Eliminar grupo",
  eliminarConfirm: (nombre: string) => `¿Está seguro de que desea eliminar el grupo "${nombre}"?`,
  eliminarConfirmText: "Sí, eliminar",
  modal: {
    titleEditar: "Editar grupo",
    titleCrear: "Crear nuevo grupo",
    submitEditar: "Actualizar grupo",
    submitCrear: "Crear grupo",
    labelNombre: "Nombre del Grupo",
    labelDescripcion: "Descripción",
    labelLineas: "Líneas de Investigación",
    placeholderNombre: "Ej: Grupo de Sostenibilidad Ambiental",
    placeholderDescripcion: "Breve descripción del grupo y sus objetivos",
    placeholderLinea: "Ingrese una línea y presione Enter",
    agregar: "Agregar",
  } as const,
  validations: {
    ingreseNombreGrupo: "Ingrese el nombre del grupo",
    agregueLinea: "Agregue al menos una línea de investigación",
  } as const,
  success: {
    actualizado: "Grupo actualizado correctamente",
    creado: "Grupo creado correctamente",
  } as const,
} as const;

export type GruposMessageKey = keyof typeof grupos;
