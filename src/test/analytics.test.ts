import { beforeEach, describe, expect, it } from "vitest";
import {
  getBrowserName,
  getDeviceType,
  isAnalyticsExcludedHost,
  normalizeAnalyticsRoute,
  sanitizeReferrer,
  shouldTrackAnalytics,
  rememberTrackedRoute,
  wasRecentlyTracked,
} from "@/lib/analytics";

describe("analytics helpers", () => {
  beforeEach(() => {
    const storage = new Map<string, string>();

    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: {
        clear: () => storage.clear(),
        getItem: (key: string) => storage.get(key) ?? null,
        removeItem: (key: string) => storage.delete(key),
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    });
  });

  it("normalizes routes without query strings or trailing slashes", () => {
    expect(normalizeAnalyticsRoute("/shop/?email=customer@example.com")).toBe("/shop");
    expect(normalizeAnalyticsRoute("/")).toBe("/");
  });

  it("excludes localhost, staging, admin, and bot traffic", () => {
    expect(isAnalyticsExcludedHost("localhost:5173")).toBe(true);
    expect(isAnalyticsExcludedHost("staging.mamespies.com")).toBe(true);
    expect(isAnalyticsExcludedHost("mamespies.com")).toBe(false);

    expect(
      shouldTrackAnalytics({
        host: "mamespies.com",
        route: "/admin",
        userAgent: "Mozilla/5.0",
      })
    ).toBe(false);

    expect(
      shouldTrackAnalytics({
        host: "mamespies.com",
        route: "/",
        userAgent: "Googlebot/2.1",
      })
    ).toBe(false);
  });

  it("detects device type and browser from user agent strings", () => {
    expect(getDeviceType("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Mobile Safari")).toBe(
      "mobile"
    );
    expect(getDeviceType("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit Chrome/120 Safari/537.36")).toBe(
      "desktop"
    );
    expect(getBrowserName("Mozilla/5.0 AppleWebKit Chrome/120 Safari/537.36")).toBe("Chrome");
    expect(getBrowserName("Mozilla/5.0 Version/17.0 Safari/605.1.15")).toBe("Safari");
  });

  it("sanitizes referrers without preserving query strings", () => {
    expect(sanitizeReferrer("https://mamespies.com/shop?email=customer@example.com", "https://mamespies.com")).toBe(
      "/shop"
    );
    expect(sanitizeReferrer("https://instagram.com/mamespies?tracking=1", "https://mamespies.com")).toBe("instagram.com");
  });

  it("deduplicates rapid repeat tracking for the same route", () => {
    expect(wasRecentlyTracked("/shop", 1_000)).toBe(false);

    rememberTrackedRoute("/shop", 1_000);

    expect(wasRecentlyTracked("/shop", 20_000)).toBe(true);
    expect(wasRecentlyTracked("/contact", 20_000)).toBe(false);
    expect(wasRecentlyTracked("/shop", 40_000)).toBe(false);
  });
});
