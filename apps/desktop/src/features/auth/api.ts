export {
  checkHealth,
  getAuthStatus,
  getCurrentSession,
  loginUsuario,
  logoutUsuario,
  bootstrap,
  bootstrapReniecDni,
} from "@/shared/http/auth";

export type {
  AuthResponse,
  HealthStatus,
  BootstrapArgs,
  ReniecDniLookupResult,
} from "@/shared/http/auth";

export { getApiErrorMessage } from "@/shared/http/error";

export type { AuthStatus, Usuario } from "@/shared/tauri/types";
