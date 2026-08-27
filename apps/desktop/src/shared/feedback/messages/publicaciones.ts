/**
 * Mensajes del modulo Publicaciones. Todos los strings user-facing de
 * PublicacionesTab deben importarse de aqui (regla de cero literales
 * inline en *.tsx).
 */

export const publicaciones = {
  panel: {
    titulo: "Publicaciones cientificas",
    subtitulo: "Listado consolidado de publicaciones sincronizadas desde Pure y CONCYTEC/PeruCRIS.",
    help: "Sobre las publicaciones",
    helpContent:
      "Las publicaciones se obtienen principalmente desde Pure (master list institucional). " +
      "El validador PeruCRIS verifica la sincronizacion contra la API publica. " +
      "La edicion directa esta deshabilitada en esta version: las altas provienen de la sincronizacion.",
  },
  toolbar: {
    search: {
      label: "Buscar",
      placeholder: "Buscar por titulo, DOI o autor",
      ariaLabel: "Buscar publicaciones por titulo, DOI o autor",
    },
    filtroAnio: {
      label: "Anio",
      todos: "Todos",
    },
    filtroTipo: {
      label: "Tipo",
      todos: "Todos",
    },
    filtroOrigen: {
      label: "Origen",
      todos: "Todos",
      pure: "Pure",
      manual: "Manual",
      perucris: "PeruCRIS",
    },
  },
  table: {
    titulo: "Titulo",
    tipo: "Tipo",
    anio: "Anio",
    autores: "Autores",
    doi: "DOI",
    origen: "Origen",
    sync: "Sincronizacion",
    sinItems: "Sin publicaciones registradas.",
    cargando: "Cargando publicaciones...",
  },
  detalle: {
    sinDoi: "Sin DOI",
    abrirDoi: "Abrir DOI",
    errorAbrirDoi: "No se pudo abrir el DOI.",
    autores: (cantidad: number) => (cantidad === 1 ? "1 autor" : `${cantidad} autores`),
  },
  empty: {
    titulo: "Aun no hay publicaciones",
    descripcion:
      "Las publicaciones apareceran aqui cuando se sincronicen desde Pure (por investigador) o desde PeruCRIS.",
  },
} as const;

export type PublicacionesMessageKey = keyof typeof publicaciones;
