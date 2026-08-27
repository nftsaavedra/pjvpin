import type {
  CambioKardex,
  InvestigadorDetalle,
  RenacytFormacionAcademicaResumen,
} from "../../features/investigadores/api";

export const parseFormacionesAcademicas = (
  value?: string | null,
): RenacytFormacionAcademicaResumen[] => {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? (parsed as RenacytFormacionAcademicaResumen[]) : [];
  } catch {
    return [];
  }
};

export const hasFormacionDate = (value?: number | null): boolean => {
  return Boolean(value && value > 0);
};

export const formatDate = (value?: number | null): string => {
  if (!value) return "No disponible";
  return new Intl.DateTimeFormat("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
};

const CAMPOS_CLASIFICATORIOS_KARDEX: ReadonlySet<string> = new Set([
  "nivel",
  "grupo",
  "condicion",
  "fecha_informe_calificacion",
  "fecha_ultima_revision",
]);

export const esCambioKardexClasificatorio = (campo: string): boolean =>
  CAMPOS_CLASIFICATORIOS_KARDEX.has(campo);

/// Determina si un investigador tiene cambios RENACYT recientes (en
/// `cambiosRenacytRecientes`) que aun no fueron revisados por el usuario.
///
/// Logica KISS: el DTO proyecta los cambios clasificadorios sin
/// `fecha_evento` per-cambio, asi que no podemos comparar contra
/// `renacytCambiosRevisadosEn` con precision. Mostramos alerta si hay
/// cambios clasificadorios. La alerta se silencia abriendo la ficha
/// (que llama `marcarCambiosRenacytRevisados`); un eventual cross-cutting
/// para filtrar por fecha en backend queda como deuda menor.
export const tieneCambiosSinRevisar = (investigador: InvestigadorDetalle): boolean => {
  const cambios = investigador.cambiosRenacytRecientes ?? [];
  return cambios.some((c: CambioKardex) => esCambioKardexClasificatorio(c.campo));
};

/// Umbral de desactualizacion RENACYT (>90 dias) para mostrar el hint
/// en la ficha del investigador. Reutilizado por el componente de la
/// seccion RENACYT.
const DIAS_DESACTUALIZADO_MS = 90 * 24 * 60 * 60 * 1000;
export const estaDesactualizado = (fecha: number | null | undefined): boolean => {
  if (!fecha) return false;
  return Date.now() - fecha > DIAS_DESACTUALIZADO_MS;
};
