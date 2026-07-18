export const proyectos = {
  sectionTitle: "Proyectos Registrados",
  relatedPanelTitle: "Entidades relacionadas",
  nuevoProyecto: "Nuevo proyecto",
  breadcrumb: "Proyectos",
  breadcrumbNuevoProyecto: "Registrar nuevo proyecto",
  breadcrumbEditar: (titulo: string) => `Editar: ${titulo}`,
  crearProyecto: "Crear Proyecto",
  guardarCambios: "Guardar cambios",
  modoConsulta: "Modo consulta: solo lectura de proyectos.",
  sectionTitles: {
    infoBasica: "Información básica",
    equipoInvestigacion: "Equipo de investigación",
    recursos: "Recursos asociados",
  } as const,
  formHelp: {
    responsableSelect:
      "Solo puede elegir como responsable a un investigador ya vinculado a este proyecto.",
  } as const,
  validations: {
    seleccioneOtroResponsable:
      "Seleccione otro investigador responsable antes de quitar al responsable actual.",
    ingreseTitulo: "Ingrese el título del proyecto",
    seleccioneResponsable: "Seleccione un investigador responsable antes de guardar los cambios.",
    seleccioneInvestigadorYResponsable: "Seleccione al menos un investigador y un responsable",
  } as const,
  changeRequest: {
    agregarInvestigador: {
      title: "Agregar investigador al proyecto",
      message: (nombre: string, proyecto: string) =>
        `Se agregará a ${nombre} al proyecto "${proyecto}".`,
      confirmText: "Sí, agregar",
    },
    quitarInvestigador: {
      title: "Quitar investigador del proyecto",
      message: (nombre: string, proyecto: string) =>
        `Se quitará a ${nombre} del proyecto "${proyecto}".`,
      confirmText: "Sí, quitar",
    },
    cambiarResponsable: {
      title: "Cambiar investigador responsable",
      message: (nombre: string) =>
        `Se asignará a ${nombre} como investigador responsable del proyecto.`,
      confirmText: "Sí, asignar responsable",
    },
    confirmarCambioFallback: "Confirmar cambio",
  } as const,
  detail: {
    volverAProyectos: "Volver a proyectos",
    volverALista: "Volver a la lista",
    editarProyecto: "Editar proyecto",
    kpiLabels: {
      investigadores: "Investigadores",
      responsable: "Responsable",
      estado: "Estado",
      recursosTotales: "Recursos totales",
    } as const,
    fallbacks: {
      sinResponsable: "Sin responsable",
      sinRenacyt: "Sin RENACYT",
    } as const,
    metricasPronto: "Métricas y gráficos de recursos — próximamente",
    sinInvestigadoresVinculados: "No hay investigadores vinculados a este proyecto.",
    investigadoresParticipantes: "Investigadores participantes",
    responsableBadge: "Responsable",
    sinRecursos: (label: string) => `Sin ${label.toLowerCase()} registrados.`,
  } as const,
  resourceTabs: {
    patentes: "Patentes",
    productos: "Productos I+D+i",
    equipamiento: "Equipamiento",
    financiamiento: "Financiamiento",
  } as const,
  table: {
    emptyState: "No hay proyectos para el filtro seleccionado",
    ariaLabel: "Tabla de proyectos registrados",
    columns: {
      titulo: "Título",
      responsable: "Responsable",
      investigadores: "Investigadores",
      estado: "Estado",
      acciones: "Acciones",
    } as const,
    actions: {
      verDetalle: "Ver detalle del proyecto",
      editar: "Editar proyecto",
      reactivar: "Reactivar proyecto",
      desactivar: "Desactivar proyecto",
      mantenerInactivo: "Mantener proyecto inactivo",
    } as const,
    desactivarDialog: {
      message: (titulo: string) => `¿Desactivar "${titulo}"?`,
      confirmText: "Sí, desactivar",
    } as const,
    sinResponsable: "Sin responsable",
    contadorInvestigador: "investigador",
    contadoresInvestigadores: "investigadores",
    soloLectura: "Solo lectura",
    modal: {
      participantesTitle: "Participantes del proyecto",
      cerrarParticipantes: "Cerrar participantes del proyecto",
      investigadoresRelacionados: (count: number) => `${count} investigadores relacionados`,
      cerrar: "Cerrar",
    } as const,
  } as const,
  checklist: {
    emptyState: "No hay investigadores registrados.",
    placeholderSearch: "Buscar investigador por nombre, DNI, grado o nivel RENACYT",
    labelSearch: "Seleccionar Investigadores *",
    chips: {
      disponibles: (count: number) => `Disponibles: ${count}`,
      seleccionados: (count: number) => `Seleccionados: ${count}`,
    } as const,
    limpiarSeleccion: "Limpiar selección",
    srHelper:
      "Busque investigadores por nombre, DNI, grado o nivel RENACYT, y use los botones para agregarlos o quitarlos de la selección.",
    quitarDeSeleccionTitle: "Quitar de la selección",
    vacio: "Aún no ha seleccionado investigadores para este proyecto.",
    busquedaMinima:
      "Escriba al menos 2 caracteres para buscar dentro de una lista grande de investigadores.",
    busquedaInicial:
      "Use el buscador para encontrar investigadores y agregarlos al proyecto sin recorrer una lista completa.",
    sinCoincidencias: "No se encontraron investigadores con ese criterio.",
    contadorRefine: (visibles: number, total: number) =>
      `Mostrando ${visibles} de ${total} coincidencias. Refine la búsqueda para acotar resultados.`,
    resultadosAriaLabel: "Resultados de investigadores",
    selected: "Seleccionado",
    agregar: "Agregar",
    responsableMeta: " · Responsable",
    responsableActual: "Responsable actual",
    fieldError: "Seleccione al menos un investigador",
    refreshMessage: "Actualizando lista de investigadores",
  } as const,
  toolbar: {
    cargando: "Cargando...",
    visibles: (count: number) => `Visibles: ${count}`,
    activos: (count: number) => `Activos: ${count}`,
    inactivos: (count: number) => `Inactivos: ${count}`,
    todos: (count: number) => `Todos: ${count}`,
    searchPlaceholder: "Buscar por título o perfil del investigador",
    searchAriaLabel: "Buscar proyectos por título o perfil del investigador",
    filtroEstadoAriaLabel: "Filtrar proyectos por estado",
    opciones: {
      todos: "Todos",
      soloActivos: "Solo activos",
      soloInactivos: "Solo inactivos",
    } as const,
  } as const,
  relatedSection: {
    emptyDefault: "No hay elementos registrados",
    campoRequerido: (label: string) => `${label} es requerido`,
    agregar: (titulo: string) => `Agregar ${titulo.toLowerCase()}`,
    editar: (titulo: string) => `Editar ${titulo.toLowerCase()}`,
    botonAgregar: (titulo: string) => `Agregar ${titulo.toLowerCase()}`,
    botonEditar: "Editar",
    selectPlaceholder: "Seleccionar...",
    eliminarTitle: "Eliminar elemento",
    eliminarMessage: "¿Está seguro de que desea eliminar este elemento?",
    eliminarConfirmText: "Sí, eliminar",
  } as const,
  diffPanel: {
    ariaLabel: "Resumen visual de cambios pendientes",
    titulo: "Cambios pendientes",
    conCambios: "Con cambios",
    sinCambios: "Sin cambios",
    vacio: "Todavía no hay diferencias respecto al proyecto actual.",
    labels: {
      titulo: "Título",
      responsable: "Responsable",
      agregados: "Agregados",
      retirados: "Retirados",
    } as const,
    fallbacks: {
      sinTitulo: "Sin título",
      sinResponsable: "Sin responsable",
    } as const,
  } as const,
} as const;

export type ProyectosMessageKey = keyof typeof proyectos;
