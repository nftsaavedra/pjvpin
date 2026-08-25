/**
 * Barrel publico para el modulo de validacion PeruCRIS.
 *
 * Mantiene el path de import historico `@/shared/hooks/usePeruCrisValidation`
 * (resuelve a este `index.ts`). Solo re-exporta la superficie publica:
 * el Provider (componente) y los tipos de opciones.
 */
export { PeruCrisValidationProvider } from "./PeruCrisValidationProvider";
export type { PeruCrisValidationProviderProps } from "./PeruCrisValidationProvider";
export { PeruCrisValidationStore } from "./PeruCrisValidationStore";
export type { PeruCrisValidationStoreOptions } from "./PeruCrisValidationStore";
