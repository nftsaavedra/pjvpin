/**
 * Mensajes del modulo PeruCRIS. Todos los strings user-facing del panel
 * PeruCrisPanel deben importarse de aqui (regla de cero literales inline
 * en *.tsx).
 */

export const perucris = {
  panel: {
    titulo: "Sincronizacion con PeruCRIS (CONCYTEC)",
    subtitulo:
      "Envia el modelo consolidado a la plataforma nacional y valida la sincronizacion contra la API publica.",
    helpLabel: "Sobre la sincronizacion con PeruCRIS",
    helpContent:
      "PeruCRIS es la plataforma de CONCYTEC para el Sistema Nacional de Ciencia, Tecnologia e Innovacion. " +
      "PJVPIN envia el modelo consolidado en formato CERIF/JSON al endpoint /cerif/ingest. " +
      "La validacion consulta el HAL publico (rest.perucris.pe, sin credenciales) para confirmar que " +
      "los identificadores (RUC, ROR, ORCID, DOI) ya estan indexados. Limitaciones conocidas: " +
      "las personas se validan por DNI (perucris.author.dni) y ORCID como fallback; " +
      "las publicaciones sin DOI se buscan por titulo; las patentes no son buscables.",
    fuente: "Fuente",
    fuenteValor: "rest.perucris.pe",
    sinEntidades: "Sin entidades activas para sincronizar.",
    vacio: "Aun no se ha ejecutado una validacion en esta sesion.",
  },

  push: {
    boton: "Enviar modelo consolidado a PeruCRIS",
    enviando: "Enviando modelo a PeruCRIS...",
    exito: (httpStatus: number, total: number) =>
      `Modelo enviado (HTTP ${httpStatus}, ${total} entidades)`,
    errorConfig:
      "PeruCRIS no esta configurado. Configure la api-key en el wizard o en pjvpin.config.json.",
    error: (msg: string) => `Error enviando a PeruCRIS: ${msg}`,
    requierePermiso: "No tiene permiso para enviar a PeruCRIS (requiere ReportesExport).",
    deshabilitado: "Envio deshabilitado: requiere rol con permiso ReportesExport.",
  },

  validar: {
    boton: "Validar sincronizacion ahora",
    validando: "Validando contra PeruCRIS...",
    exito: (e: number, f: number, d: number) =>
      `Validacion completa: ${e} encontradas, ${f} faltantes, ${d} con diferencias.`,
    sinDiferencias: "Validacion completa: sin diferencias.",
    error: (msg: string) => `Error validando: ${msg}`,
    verDetalle: "Ver detalle completo",
    cerrarDetalle: "Cerrar detalle",
    tiempo: (ms: number) => `${ms} ms`,
  },

  detalle: {
    titulo: "Detalle de validacion",
    columnas: {
      tipo: "Tipo",
      idLocal: "ID local",
      encontrado: "Estado",
      uuid: "UUID PeruCRIS",
      handle: "Handle",
      diferencias: "Diferencias",
    },
    estado: {
      encontrado: "Encontrado",
      noEncontrado: "No encontrado",
      conDiferencias: "Con diferencias",
    },
    filaVacia: "Sin entidades para mostrar.",
    contadoresPorTipo: {
      orgunit: "OrgUnits",
      person: "Personas",
      project: "Proyectos",
      publication: "Publicaciones",
      patent: "Patentes",
    },
  },

  importar: {
    boton: "Importar iniciales desde PeruCRIS",
    helpLabel: "Sobre la importacion inicial",
    helpContent:
      "Importa los proyectos de UNF y las publicaciones asociables a la institucion o a los DNIs de los investigadores locales. " +
      "Solo lectura del endpoint publico: no requiere api-key. Tras una importacion exitosa, ejecute la validacion para confirmar el mapping.",
    confirm: {
      titulo: "Importar datos de PeruCRIS",
      mensaje:
        "Se importaran los proyectos y publicaciones detectadas por RUC institucional y por DNI de los investigadores locales. " +
        "Las duplicadas se omiten. La operacion consume ancho de banda del endpoint publico.",
      confirmar: "Importar",
    },
    ejecutando: "Importando desde PeruCRIS...",
    error: (msg: string) => `Error importando: ${msg}`,
    requierePermiso: "No tiene permiso para importar (requiere ReportesExport).",
    deshabilitado: "Importacion deshabilitada: requiere rol con permiso ReportesExport.",
    resumen: {
      titulo: "Resultado de la importacion",
      proyectos: "Proyectos",
      publicaciones: "Publicaciones",
      importados: "Importados",
      omitidosDuplicado: "Omitidos (duplicado)",
      autoresVinculados: "Autores vinculados",
      sinAutorVinculado: "Sin autor vinculado",
      errores: "Errores",
      avisos: "Avisos",
      verAvisos: "Ver avisos",
      verErrores: "Ver errores",
    },
  },
} as const;

export type PeruCrisMessageKey = keyof typeof perucris;
