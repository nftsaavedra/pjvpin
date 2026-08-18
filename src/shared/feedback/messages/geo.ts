export const geo = {
  selectUbigeo: "Ubigeo",
  selectDepartamento: "Departamento",
  selectProvincia: "Provincia",
  selectDistrito: "Distrito",
  helpUbigeo: "Seleccione la ubicación geográfica (departamento, provincia y distrito).",
  errorCarga: "No se pudieron cargar los ubigeos.",
  cargandoUbigeos: "Cargando ubigeos...",
  sinUbigeos: "Sin datos de ubigeo.",
} as const;

export type GeoMessageKey = keyof typeof geo;
