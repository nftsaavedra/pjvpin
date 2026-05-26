export interface Usuario {
  id_usuario: string;
  username: string;
  nombre_completo: string;
  rol: string;
  activo: number;
}

export interface AuthStatus {
  has_users: boolean;
  requires_setup: boolean;
}
