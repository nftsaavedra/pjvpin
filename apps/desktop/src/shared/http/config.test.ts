import { describe, it, expect, vi, beforeEach } from "vitest";

let mockLocalStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { mockLocalStorage[key] = undefined as unknown as string; },
});

import { getApiUrl, setApiUrl, getApiBaseUrl } from "./config";

beforeEach(() => {
  mockLocalStorage = {};
});

describe("config", () => {
  it("getApiUrl returns default when nothing set", () => {
    expect(getApiUrl()).toBe("http://localhost:18080");
  });

  it("getApiUrl prefers localStorage over env/default", () => {
    mockLocalStorage["pjvpin.apiUrl"] = "https://custom.api:3000";
    expect(getApiUrl()).toBe("https://custom.api:3000");
  });

  it("getApiUrl trims stored value", () => {
    mockLocalStorage["pjvpin.apiUrl"] = "  https://trimmed.com  ";
    expect(getApiUrl()).toBe("https://trimmed.com");
  });

  it("getApiUrl ignores empty stored value", () => {
    mockLocalStorage["pjvpin.apiUrl"] = "   ";
    expect(getApiUrl()).toBe("http://localhost:18080");
  });

  it("setApiUrl persists trimmed URL", () => {
    setApiUrl("  https://new.api  ");
    expect(mockLocalStorage["pjvpin.apiUrl"]).toBe("https://new.api");
  });

  it("getApiBaseUrl appends /api/v1", () => {
    expect(getApiBaseUrl()).toBe("http://localhost:18080/api/v1");
    mockLocalStorage["pjvpin.apiUrl"] = "https://prod.api";
    expect(getApiBaseUrl()).toBe("https://prod.api/api/v1");
  });
});
