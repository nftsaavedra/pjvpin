export const catalogos = {
  panel: {
    volverA: "Volver a catálogos",
    breadcrumb: "Catálogos",
    tituloSistema: "Catálogos del Sistema",
    pillTodos: "Todos",
    statActivos: "activos",
    statInactivos: "inactivos",
    hintAdministrar: "Administrar →",
    ariaLabel: (titulo: string) => `Administrar ${titulo}`,
  } as const,
  tab: {
    nuevoElemento: "Nuevo elemento",
    searchPlaceholder: "Buscar por código, nombre o descripción",
    searchAriaLabel: (titulo: string) => `Buscar en ${titulo}`,
    filtroEstadoAriaLabel: (titulo: string) => `Filtrar ${titulo} por estado`,
    tableAriaLabel: (titulo: string) => `Tabla de ${titulo}`,
    columns: {
      codigo: "Código",
      nombre: "Nombre",
      descripcion: "Descripción",
      acciones: "Acciones",
    } as const,
    actions: {
      reactivar: "Reactivar elemento",
      editar: "Editar elemento",
      desactivarEliminar: "Desactivar o eliminar elemento",
    } as const,
    modal: {
      editar: (titulo: string) => `Editar Elemento — ${titulo}`,
      crear: (titulo: string) => `Crear Elemento — ${titulo}`,
    } as const,
    confirm: {
      title: "Desactivar o eliminar elemento",
      message: (nombre: string, titulo: string) =>
        `¿Eliminar "${nombre}" de ${titulo}? Si está en uso, se desactivará.`,
    } as const,
    validations: {
      completeCampos: "Complete los campos obligatorios del catálogo",
    } as const,
    success: {
      actualizado: "Elemento actualizado",
      creado: "Elemento creado",
      reactivado: "Elemento reactivado correctamente",
    } as const,
  } as const,
} as const;

export type CatalogosMessageKey = keyof typeof catalogos;
