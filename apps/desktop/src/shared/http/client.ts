import { AppError, getApiErrorMessage } from "./error";
import { getApiBaseUrl } from "./config";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStore";

interface ApiFetchOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  noAuth?: boolean;
}

function buildUrl(path: string, query?: Record<string, string | number | boolean | undefined>): string {
  const url = `${getApiBaseUrl()}${path}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function isAuthPath(path: string): boolean {
  return path.startsWith("/auth/");
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;

  const url = `${getApiBaseUrl()}/auth/refresh`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { accessToken: string; refreshToken: string };
    setTokens(data.accessToken, data.refreshToken);
    return true;
  } catch {
    return false;
  }
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { method = "GET", body, query, noAuth = false } = options;
  const url = buildUrl(path, query);

  const headers: Record<string, string> = {};
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (!noAuth) {
    const token = getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  }

  const fetchOptions: RequestInit = {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };

  let res = await fetch(url, fetchOptions);

  if (res.status === 401 && !noAuth && !isAuthPath(path)) {
    if (!refreshPromise) {
      refreshPromise = tryRefresh();
    }
    const refreshed = await refreshPromise;
    refreshPromise = null;

    if (refreshed) {
      const newToken = getAccessToken();
      if (newToken) headers["Authorization"] = `Bearer ${newToken}`;
      res = await fetch(url, { ...fetchOptions, headers });
    }
  }

  if (res.status === 204) return undefined as T;

  let responseBody: unknown;
  const contentType = res.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    responseBody = await res.json();
  } else {
    responseBody = await res.text();
  }

  if (!res.ok) {
    if (res.status === 401 && !noAuth) {
      clearTokens();
    }
    throw new AppError(getApiErrorMessage(res.status, responseBody));
  }

  return responseBody as T;
}
