export interface Usuario {
  id_usuario: string;
  username: string;
  nombre_completo: string | null;
  rol: string;
  activo: number;
  investigador_id?: string | null;
  persona_id?: string | null;
  dni?: string | null;
  updated_at?: number | null;
}

export interface AuthStatus {
  has_users: boolean;
  requires_setup: boolean;
}
