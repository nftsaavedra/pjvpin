import { describe, it, expect, vi } from "vitest";

const mockApiFetch = vi.fn<(...args: unknown[]) => unknown>();
vi.mock("../http/client", () => ({
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
}));

import {
  checkHealth,
  getAuthStatus,
  loginUsuario,
  getCurrentSession,
  logoutUsuario,
  bootstrap,
  bootstrapReniecDni,
} from "./auth";

describe("auth endpoints", () => {
  it("checkHealth calls /health with noAuth", async () => {
    mockApiFetch.mockResolvedValueOnce({ ok: true, has_users: true, requires_setup: false, version: "1.0" });
    const result = await checkHealth();
    expect(mockApiFetch).toHaveBeenCalledWith("/health", { noAuth: true });
    expect(result.ok).toBe(true);
  });

  it("getAuthStatus calls /auth/status with noAuth", async () => {
    mockApiFetch.mockResolvedValueOnce({ has_users: true, requires_setup: false });
    await getAuthStatus();
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/status", { noAuth: true });
  });

  it("loginUsuario POSTs credentials with noAuth", async () => {
    mockApiFetch.mockResolvedValueOnce({ user: { id: "1" }, access_token: "a", refresh_token: "r" });
    await loginUsuario("admin", "pass123");
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/login", {
      method: "POST",
      body: { username: "admin", password: "pass123" },
      noAuth: true,
    });
  });

  it("getCurrentSession calls /auth/session (authenticated)", async () => {
    mockApiFetch.mockResolvedValueOnce({ id: "1", username: "admin" });
    await getCurrentSession();
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/session");
  });

  it("logoutUsuario POSTs to /auth/logout", async () => {
    mockApiFetch.mockResolvedValueOnce(undefined);
    await logoutUsuario();
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/logout", { method: "POST" });
  });

  it("bootstrap POSTs body with noAuth", async () => {
    const body = { username: "admin", password: "pass", dni: "12345678" };
    mockApiFetch.mockResolvedValueOnce({ id: "1" });
    await bootstrap(body);
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/bootstrap", {
      method: "POST",
      body,
      noAuth: true,
    });
  });

  it("bootstrapReniecDni POSTs numero with noAuth", async () => {
    mockApiFetch.mockResolvedValueOnce({ first_name: "Juan", first_last_name: "Perez", second_last_name: "Lopez", full_name: "Juan Perez Lopez", document_number: "12345678" });
    await bootstrapReniecDni("12345678");
    expect(mockApiFetch).toHaveBeenCalledWith("/auth/bootstrap/reniec-dni", {
      method: "POST",
      body: { numero: "12345678" },
      noAuth: true,
    });
  });
});
