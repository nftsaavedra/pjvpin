import { apiFetch } from "../http/client";
import type { Usuario, AuthStatus } from "./types";

export interface AuthResponse {
  user: Usuario;
  accessToken: string;
  refreshToken: string;
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
  apellidoPaterno?: string;
  apellidoMaterno?: string;
}

export interface ReniecDniLookupResult {
  firstName: string;
  firstLastName: string;
  secondLastName: string;
  fullName: string;
  documentNumber: string;
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
