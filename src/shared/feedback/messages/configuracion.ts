export const configuracion = {
  filter: {
    visibles: (count: number) => `Visibles: ${count}`,
    todos: (count: number) => `Todos: ${count}`,
    activos: (count: number) => `Activos: ${count}`,
    inactivos: (count: number) => `Inactivos: ${count}`,
    opciones: {
      todos: "Todos",
      soloActivos: "Solo activos",
      soloInactivos: "Solo inactivos",
    } as const,
  } as const,
  actions: {
    nuevo: "Nuevo",
    editar: "Editar",
    actualizar: "Actualizar",
    crear: "Crear",
    reactivar: "Reactivar",
    desactivar: "Desactivar",
  } as const,
  confirm: {
    siContinuar: "Sí, continuar",
    noCancelar: "No, cancelar",
    siDesactivar: "Sí, desactivar",
    siReactivar: "Sí, reactivar",
    siEliminar: "Sí, eliminar",
  } as const,
  tab: {
    grados: "Grados",
    catalogos: "Catálogos",
    usuarios: "Usuarios",
    sinPermisos: "No tiene permisos para acceder a ninguna sección de configuración.",
    ariaLabel: "Secciones de configuración",
  } as const,
} as const;

export type ConfiguracionMessageKey = keyof typeof configuracion;
