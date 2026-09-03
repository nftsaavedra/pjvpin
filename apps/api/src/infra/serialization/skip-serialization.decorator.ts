import { SetMetadata } from "@nestjs/common";

export const SKIP_SERIALIZATION_KEY = "skipSerialization";

/**
 * Decorator que excluye un handler o controller del transform
 * snake_case ↔ camelCase. Útil para endpoints cuyo payload es un schema
 * de dominio que debe conservar sus keys originales (ej. CERIF JSON spec).
 */
export const SkipSerialization = () => SetMetadata(SKIP_SERIALIZATION_KEY, true);
