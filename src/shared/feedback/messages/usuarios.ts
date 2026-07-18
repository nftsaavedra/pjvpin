export const usuarios = {
  tab: {
    sectionTitle: "Usuarios registrados",
    nuevoUsuario: "Nuevo usuario",
    searchPlaceholder: "Buscar por usuario, nombre, DNI o rol",
    searchAriaLabel: "Buscar usuarios por nombre, usuario, DNI o rol",
    filtroEstadoAriaLabel: "Filtrar usuarios por estado",
    tableAriaLabel: "Tabla de usuarios registrados",
    columns: {
      usuario: "Usuario",
      dni: "DNI",
      nombre: "Nombre",
      rol: "Rol",
      estado: "Estado",
      acciones: "Acciones",
    } as const,
    actions: {
      editarPropio: "Editar su propio usuario",
      editar: "Editar usuario",
      noCambiaEstado: "No puede cambiar su propio estado",
      desactivar: "Desactivar usuario",
      reactivar: "Reactivar usuario",
    } as const,
    modal: {
      editar: "Editar Usuario",
      crear: "Crear Usuario",
      submitEditar: "Guardar cambios",
      submitCrear: "Crear usuario",
    } as const,
    confirm: {
      desactivar: {
        title: "Desactivar usuario",
        message: (username: string) => `¿Desea desactivar al usuario "${username}"?`,
      },
      reactivar: {
        title: "Reactivar usuario",
        message: (username: string) => `¿Desea reactivar al usuario "${username}"?`,
      },
    } as const,
  } as const,
} as const;

export type UsuariosMessageKey = keyof typeof usuarios;
