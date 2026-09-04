import { apiFetch } from "../http/client";
import type { Usuario, AuthStatus } from "./types";

export interface AuthResponse {
  user: Usuario;
  access_token: string;
  refresh_token: string;
}

export interface HealthStatus {
  ok: boolean;
  has_users: boolean;
  requires_setup: boolean;
  version: string;
}

export interface BootstrapArgs {
  username: string;
  password: string;
  dni: string;
  nombres?: string;
  apellido_paterno?: string;
  apellido_materno?: string;
}

export interface ReniecDniLookupResult {
  first_name: string;
  first_last_name: string;
  second_last_name: string;
  full_name: string;
  document_number: string;
}

export async function checkHealth(): Promise<HealthStatus> {
  return apiFetch<HealthStatus>("/health", { noAuth: true });
}

export async function getAuthStatus(): Promise<AuthStatus> {
  return apiFetch<AuthStatus>("/auth/status", { noAuth: true });
}

export async function loginUsuario(
  username: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>("/auth/login", {
    method: "POST",
    body: { username, password },
    noAuth: true,
  });
}

export async function getCurrentSession(): Promise<Usuario | null> {
  return apiFetch<Usuario | null>("/auth/session");
}

export async function logoutUsuario(): Promise<void> {
  await apiFetch("/auth/logout", { method: "POST" });
}

export async function bootstrap(body: BootstrapArgs): Promise<Usuario> {
  return apiFetch<Usuario>("/auth/bootstrap", {
    method: "POST",
    body,
    noAuth: true,
  });
}

export async function bootstrapReniecDni(
  numero: string,
): Promise<ReniecDniLookupResult> {
  return apiFetch<ReniecDniLookupResult>("/auth/bootstrap/reniec-dni", {
    method: "POST",
    body: { numero },
    noAuth: true,
  });
}
