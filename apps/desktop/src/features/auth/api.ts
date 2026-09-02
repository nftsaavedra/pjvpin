export {
  checkHealth,
  getAuthStatus,
  getCurrentSession,
  loginUsuario,
  logoutUsuario,
  bootstrap,
  bootstrapReniecDni,
} from "@/shared/api/auth";

export type {
  AuthResponse,
  HealthStatus,
  BootstrapArgs,
  ReniecDniLookupResult,
} from "@/shared/api/auth";

export { getApiErrorMessage, getErrorMessage } from "@/shared/http/error";

export type { AuthStatus, Usuario } from "@/shared/api/types";
