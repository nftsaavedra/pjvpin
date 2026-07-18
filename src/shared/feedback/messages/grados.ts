export const grados = {
  tab: {
    sectionTitle: "Grados Registrados",
    nuevoGrado: "Nuevo grado",
    searchPlaceholder: "Buscar por nombre o descripción",
    searchAriaLabel: "Buscar grados por nombre o descripción",
    filtroEstadoAriaLabel: "Filtrar grados por estado",
    tableAriaLabel: "Tabla de grados académicos registrados",
    columns: {
      nombre: "Nombre",
      descripcion: "Descripción",
      acciones: "Acciones",
    } as const,
    actions: {
      reactivar: "Reactivar grado",
      editar: "Editar grado",
      desactivarEliminar: "Desactivar o eliminar grado",
    } as const,
    modal: {
      editar: "Editar Grado Académico",
      crear: "Crear Grado Académico",
    } as const,
    confirm: {
      title: "Desactivar o eliminar grado académico",
      message: (nombre: string) =>
        `¿Eliminar "${nombre}"? Si tiene investigadores, se desactivará.`,
    } as const,
    validations: {
      ingreseNombre: "Ingrese el nombre del grado",
    } as const,
    success: {
      actualizado: "Grado actualizado",
      creado: "Grado creado",
      reactivado: "Grado reactivado correctamente",
    } as const,
    refreshMessage: "Actualizando grados",
  } as const,
} as const;

export type GradosMessageKey = keyof typeof grados;
