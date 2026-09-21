/**
 * Re-export de la matriz RBAC desde `@pjvpin/shared` (fuente unica de verdad).
 * Mantiene los nombres locales esperados por los consumers existentes.
 */
export {
  APP_PERMISSIONS,
  APP_ROLES,
  type AppRole,
  type AppPermission,
  normalizeRole,
  roleHasPermission,
  permissionsForRole,
} from "@pjvpin/shared";
