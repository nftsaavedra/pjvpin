import { describe, it, expect, vi, beforeEach } from "vitest";

let mockLocalStorage: Record<string, string> = {};
vi.stubGlobal("localStorage", {
  getItem: (key: string) => mockLocalStorage[key] ?? null,
  setItem: (key: string, value: string) => { mockLocalStorage[key] = value; },
  removeItem: (key: string) => { mockLocalStorage[key] = undefined as unknown as string; },
});

import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./tokenStore";

beforeEach(() => {
  mockLocalStorage = {};
});

describe("tokenStore", () => {
  it("getAccessToken returns null when empty", () => {
    expect(getAccessToken()).toBeNull();
  });

  it("getRefreshToken returns null when empty", () => {
    expect(getRefreshToken()).toBeNull();
  });

  it("setTokens stores both tokens", () => {
    setTokens("access-123", "refresh-456");
    expect(getAccessToken()).toBe("access-123");
    expect(getRefreshToken()).toBe("refresh-456");
  });

  it("clearTokens removes both tokens", () => {
    setTokens("access", "refresh");
    clearTokens();
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
  });

  it("uses correct localStorage keys", () => {
    setTokens("a", "r");
    expect(mockLocalStorage["pjvpin.auth.access"]).toBe("a");
    expect(mockLocalStorage["pjvpin.auth.refresh"]).toBe("r");
  });
});
