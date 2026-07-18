export const shared = {
  errorBoundaryTitleDefault: "Error inesperado",
  errorBoundaryMessageDefault: "Ocurrio un error al cargar esta seccion.",
  modal: {
    cerrarDialogo: "Cerrar diálogo",
    cerrarFormulario: "Cerrar formulario",
    procesando: "Procesando...",
  } as const,
  app: {
    authSubtitle: "Gestión de Proyectos e Investigadores",
    loadingSubtitleVerificandoConfig: "Verificando configuracion del sistema",
    loadingSubtitleVerificandoAcceso: "Verificando acceso al sistema",
    fatalFallback: {
      message: "La aplicacion encontro un error al cargar la interfaz principal.",
      instructions:
        "Recarga la ventana para continuar. Si el problema persiste, contacta al administrador del sistema.",
      reloadButton: "Recargar aplicacion",
    } as const,
  } as const,
  navigation: {
    menu: "Menú",
    expandirNavegacion: "Expandir navegación",
    colapsarNavegacion: "Colapsar navegación",
  } as const,
} as const;

export type SharedMessageKey = keyof typeof shared;
