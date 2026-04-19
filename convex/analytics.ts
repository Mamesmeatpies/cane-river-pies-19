import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const DEDUPE_WINDOW_MS = 30_000;
const SUMMARY_EVENT_LIMIT = 5_000;
const RECENT_ACTIVITY_LIMIT = 8;
const SHA_256_LENGTH = 64;

const deviceTypeValidator = v.union(
  v.literal("desktop"),
  v.literal("mobile"),
  v.literal("tablet"),
  v.literal("bot"),
  v.literal("unknown")
);

const getAdminAccess = (adminKey: string) => {
  const configuredKey = process.env.ADMIN_PORTAL_KEY;

  if (!configuredKey) {
    return "missing";
  }

  if (adminKey !== configuredKey) {
    return "denied";
  }

  return "granted";
};

const getDayKey = (timestamp: number) => new Date(timestamp).toISOString().slice(0, 10);

const isValidHash = (value: string) => new RegExp(`^[a-f0-9]{${SHA_256_LENGTH}}$`, "i").test(value);

const normalizeText = (value: string | undefined, maxLength: number) => {
  const normalizedValue = (value ?? "").trim();

  return normalizedValue ? normalizedValue.slice(0, maxLength) : undefined;
};

const isExcludedHost = (host: string) => {
  const normalizedHost = host.trim().toLowerCase();

  return (
    !normalizedHost ||
    normalizedHost === "localhost" ||
    normalizedHost.startsWith("localhost:") ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost.startsWith("127.0.0.1:") ||
    normalizedHost === "0.0.0.0" ||
    normalizedHost.startsWith("0.0.0.0:") ||
    normalizedHost.endsWith(".local") ||
    /(^|\.)staging\.|staging-|preview-|-git-/i.test(normalizedHost)
  );
};

const isExcludedRoute = (route: string) => /^\/admin(?:\/|$)|^\/api\/admin(?:\/|$)/i.test(route);

const getSevenDayBuckets = (now: number) =>
  Array.from({ length: 7 }, (_, index) => {
    const date = new Date(now);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    date.setUTCHours(0, 0, 0, 0);

    return {
      day: getDayKey(date.getTime()),
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        timeZone: "UTC",
      }),
      visits: 0,
      uniqueVisitors: new Set<string>(),
    };
  });

const summarizeEvents = (events: Array<{
  route: string;
  referrer?: string;
  dailyVisitorKey: string;
  day: string;
  deviceType: "desktop" | "mobile" | "tablet" | "bot" | "unknown";
  browser?: string;
  createdAt: number;
}>) => {
  const now = Date.now();
  const today = getDayKey(now);
  const routeCounts = new Map<string, number>();
  const uniqueToday = new Set<string>();
  const buckets = getSevenDayBuckets(now);
  const bucketByDay = new Map(buckets.map((bucket) => [bucket.day, bucket]));

  for (const event of events) {
    routeCounts.set(event.route, (routeCounts.get(event.route) ?? 0) + 1);

    if (event.day === today) {
      uniqueToday.add(event.dailyVisitorKey);
    }

    const bucket = bucketByDay.get(event.day);

    if (bucket) {
      bucket.visits += 1;
      bucket.uniqueVisitors.add(event.dailyVisitorKey);
    }
  }

  return {
    totalVisits: events.length,
    uniqueVisitorsToday: uniqueToday.size,
    topPages: Array.from(routeCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([route, views]) => ({
        route,
        views,
      })),
    sevenDayTrend: buckets.map((bucket) => ({
      day: bucket.day,
      label: bucket.label,
      visits: bucket.visits,
      uniqueVisitors: bucket.uniqueVisitors.size,
    })),
    recentActivity: events.slice(0, RECENT_ACTIVITY_LIMIT).map((event) => ({
      route: event.route,
      referrer: event.referrer,
      deviceType: event.deviceType,
      browser: event.browser,
      createdAt: event.createdAt,
    })),
  };
};

export const trackPageView = mutation({
  args: {
    route: v.string(),
    host: v.string(),
    referrer: v.optional(v.string()),
    visitorKey: v.string(),
    dailyVisitorKey: v.string(),
    deviceType: deviceTypeValidator,
    browser: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const route = normalizeText(args.route, 160) ?? "/";
    const host = normalizeText(args.host, 160) ?? "";
    const referrer = normalizeText(args.referrer, 160);
    const browser = normalizeText(args.browser, 80);

    if (
      !route.startsWith("/") ||
      isExcludedRoute(route) ||
      isExcludedHost(host) ||
      args.deviceType === "bot" ||
      !isValidHash(args.visitorKey) ||
      !isValidHash(args.dailyVisitorKey)
    ) {
      console.warn("Analytics page view skipped", {
        route,
        host,
        deviceType: args.deviceType,
      });

      return {
        tracked: false,
        reason: "excluded",
      };
    }

    const now = Date.now();
    const recentEvent = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_visitor_route_createdAt", (q) => q.eq("visitorKey", args.visitorKey).eq("route", route))
      .order("desc")
      .first();

    if (recentEvent && now - recentEvent.createdAt < DEDUPE_WINDOW_MS) {
      return {
        tracked: false,
        reason: "duplicate",
      };
    }

    try {
      await ctx.db.insert("analyticsEvents", {
        route,
        host,
        referrer,
        visitorKey: args.visitorKey,
        dailyVisitorKey: args.dailyVisitorKey,
        day: getDayKey(now),
        deviceType: args.deviceType,
        browser,
        createdAt: now,
      });

      return {
        tracked: true,
      };
    } catch (error) {
      console.error("Analytics page view insert failed", error);
      throw new Error("Could not record analytics event.");
    }
  },
});

export const summaryForAdmin = query({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        summary: null,
      };
    }

    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .take(SUMMARY_EVENT_LIMIT);

    return {
      access,
      summary: summarizeEvents(events),
    };
  },
});

export const summaryInternal = internalQuery({
  args: {},
  handler: async (ctx) => {
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_createdAt")
      .order("desc")
      .take(SUMMARY_EVENT_LIMIT);

    return summarizeEvents(events);
  },
});
