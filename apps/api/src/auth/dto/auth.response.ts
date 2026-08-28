export interface UsuarioDto {
  id_usuario: string;
  username: string;
  nombre_completo: string;
  rol: string;
  activo: number;
  persona_id: string | null;
  dni: string | null;
}

export interface AuthResponse {
  user: UsuarioDto;
  accessToken: string;
  refreshToken: string;
}

export interface AuthStatusDto {
  has_users: boolean;
  requires_setup: boolean;
}
