const API_URL_KEY = "pjvpin.apiUrl";
const DEFAULT_API_URL = "http://localhost:18080";

export function getApiUrl(): string {
  const stored = localStorage.getItem(API_URL_KEY);
  if (stored && stored.trim()) return stored.trim();

  const env = import.meta.env.PJVPIN_API_URL as string | undefined;
  if (env && typeof env === "string" && env.trim()) return env.trim();

  return DEFAULT_API_URL;
}

export function setApiUrl(url: string): void {
  localStorage.setItem(API_URL_KEY, url.trim());
}

export function getApiBaseUrl(): string {
  return `${getApiUrl()}/api/v1`;
}
