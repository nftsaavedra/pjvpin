export {
  getAuthStatus,
  getCurrentSession,
  loginUsuario,
  logoutUsuario,
  registrarPrimerUsuario,
} from '@/shared/tauri/auth';

export { getTauriErrorMessage } from '@/shared/tauri/error';

export type { AuthStatus, Usuario } from '@/shared/tauri/types';