import { describe, it, expect, vi, beforeEach } from "vitest";

const mockFetch = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
vi.stubGlobal("fetch", mockFetch);

let mockLocalStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { mockLocalStorage[key] = undefined as unknown as string; },
});

vi.mock("./config", () => ({
  getApiBaseUrl: () => "http://localhost:18080/api/v1",
}));

import { apiFetch, refreshSession } from "./client";

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers({ "content-type": "application/json" }),
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(JSON.stringify(body)),
  } as unknown as Response;
}

function noContentResponse(): Response {
  return {
    ok: true,
    status: 204,
    headers: new Headers(),
    json: () => Promise.reject(new Error("no body")),
    text: () => Promise.resolve(""),
  } as unknown as Response;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockLocalStorage = {};
});

describe("apiFetch", () => {
  it("returns parsed JSON on 200", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({ nombre: "test" }));
    const result = await apiFetch<{ nombre: string }>("/endpoint");
    expect(result).toEqual({ nombre: "test" });
    expect(mockFetch).toHaveBeenCalledWith(
      "http://localhost:18080/api/v1/endpoint",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("returns undefined on 204", async () => {
    mockFetch.mockResolvedValueOnce(noContentResponse());
    const result = await apiFetch("/endpoint");
    expect(result).toBeUndefined();
  });

  it("serializes query params", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await apiFetch("/endpoint", { query: { tipo: "patente", limit: 10, active: true } });
    const url = mockFetch.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("tipo=patente");
    expect(url).toContain("limit=10");
    expect(url).toContain("active=true");
  });

  it("skips undefined query values", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse([]));
    await apiFetch("/endpoint", { query: { a: "1", b: undefined } });
    const url = mockFetch.mock.calls[0]?.[0] ?? "";
    expect(url).toContain("a=1");
    expect(url).not.toContain("b=");
  });

  it("injects Bearer token when authenticated", async () => {
    mockLocalStorage["pjvpin.auth.access"] = "my-token";
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await apiFetch("/endpoint");
    const init = mockFetch.mock.calls[0]?.[1] as Record<string, unknown>;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-token");
  });

  it("skips Bearer token when noAuth=true", async () => {
    mockLocalStorage["pjvpin.auth.access"] = "my-token";
    mockFetch.mockResolvedValueOnce(jsonResponse({}));
    await apiFetch("/endpoint", { noAuth: true });
    const init = mockFetch.mock.calls[0]?.[1] as Record<string, unknown>;
    const headers = init.headers as Record<string, string>;
    expect(headers["Authorization"]).toBeUndefined();
  });

  it("throws AppError with formatted message on non-2xx", async () => {
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ NotFound: "Investigador no encontrado." }, 404),
    );
    await expect(apiFetch("/endpoint")).rejects.toThrow("Investigador no encontrado.");
  });

  it("falls back to status message when no variant", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 403));
    await expect(apiFetch("/endpoint")).rejects.toThrow("No tiene permisos para esta accion");
  });

  it("clears tokens on 401 (non-auth path)", async () => {
    mockLocalStorage["pjvpin.auth.access"] = "expired";
    mockLocalStorage["pjvpin.auth.refresh"] = "refresh-token";
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(apiFetch("/endpoint")).rejects.toThrow();
    expect(mockLocalStorage["pjvpin.auth.access"]).toBeUndefined();
    expect(mockLocalStorage["pjvpin.auth.refresh"]).toBeUndefined();
  });

  it("does not clear tokens on 401 for auth paths", async () => {
    mockLocalStorage["pjvpin.auth.access"] = "expired";
    mockLocalStorage["pjvpin.auth.refresh"] = "refresh-token";
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(apiFetch("/auth/login", { noAuth: true })).rejects.toThrow();
    expect(mockLocalStorage["pjvpin.auth.access"]).toBe("expired");
  });

  it("attempts refresh on 401 and retries once", async () => {
    mockLocalStorage["pjvpin.auth.access"] = "expired";
    mockLocalStorage["pjvpin.auth.refresh"] = "valid-refresh";

    // First call: 401
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));
    // Refresh call: success
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ accessToken: "new-access", refreshToken: "new-refresh" }),
    );
    // Retry call: success
    mockFetch.mockResolvedValueOnce(jsonResponse({ data: "ok" }));

    const result = await apiFetch<{ data: string }>("/endpoint");
    expect(result).toEqual({ data: "ok" });
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(mockLocalStorage["pjvpin.auth.access"]).toBe("new-access");
    expect(mockLocalStorage["pjvpin.auth.refresh"]).toBe("new-refresh");
  });

  it("does not attempt refresh on auth paths", async () => {
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));
    await expect(apiFetch("/auth/session")).rejects.toThrow();
    // Only 1 call (no refresh attempt)
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("refreshSession", () => {
  it("returns false when no refresh token", async () => {
    const result = await refreshSession();
    expect(result).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns true and sets tokens on success", async () => {
    mockLocalStorage["pjvpin.auth.refresh"] = "old-refresh";
    mockFetch.mockResolvedValueOnce(
      jsonResponse({ accessToken: "new-access", refreshToken: "new-refresh" }),
    );
    const result = await refreshSession();
    expect(result).toBe(true);
    expect(mockLocalStorage["pjvpin.auth.access"]).toBe("new-access");
    expect(mockLocalStorage["pjvpin.auth.refresh"]).toBe("new-refresh");
  });

  it("returns false on non-ok response", async () => {
    mockLocalStorage["pjvpin.auth.refresh"] = "invalid";
    mockFetch.mockResolvedValueOnce(jsonResponse({}, 401));
    const result = await refreshSession();
    expect(result).toBe(false);
  });

  it("returns false on network error", async () => {
    mockLocalStorage["pjvpin.auth.refresh"] = "token";
    mockFetch.mockRejectedValueOnce(new TypeError("Failed to fetch"));
    const result = await refreshSession();
    expect(result).toBe(false);
  });
});
