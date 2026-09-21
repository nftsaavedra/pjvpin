import { HttpException, HttpStatus } from "@nestjs/common";
import { LoginRateLimiterService } from "./login-rate-limiter.service";

describe("LoginRateLimiterService", () => {
  let service: LoginRateLimiterService;

  beforeEach(() => {
    service = new LoginRateLimiterService();
    jest.useFakeTimers({ now: new Date("2026-01-01T00:00:00Z") });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("rejects the 6th consecutive failed attempt for the same username", () => {
    expect(() => {
      for (let i = 0; i < 5; i++) service.checkAndRecord("admin");
    }).not.toThrow();
    expect(() => service.checkAndRecord("admin")).toThrow(HttpException);
    try {
      service.checkAndRecord("admin");
    } catch (err) {
      expect((err as HttpException).getStatus()).toBe(HttpStatus.TOO_MANY_REQUESTS);
    }
  });

  it("isolates limits per username", () => {
    for (let i = 0; i < 5; i++) service.checkAndRecord("admin");
    expect(() => service.checkAndRecord("otro")).not.toThrow();
  });

  it("resets the counter on clear()", () => {
    for (let i = 0; i < 5; i++) service.checkAndRecord("admin");
    service.clear("admin");
    expect(() => service.checkAndRecord("admin")).not.toThrow();
  });

  it("expires the window after 15 minutes", () => {
    for (let i = 0; i < 5; i++) service.checkAndRecord("admin");
    expect(() => service.checkAndRecord("admin")).toThrow(HttpException);
    jest.setSystemTime(new Date("2026-01-01T00:15:01Z"));
    expect(() => service.checkAndRecord("admin")).not.toThrow();
  });

  it("normalizes username (case + trim) for keying", () => {
    for (let i = 0; i < 5; i++) service.checkAndRecord("  Admin  ");
    expect(() => service.checkAndRecord("admin")).toThrow(HttpException);
    service.clear("ADMIN");
    expect(() => service.checkAndRecord("admin")).not.toThrow();
  });
});
