export type AnalyticsDeviceType = "desktop" | "mobile" | "tablet" | "bot" | "unknown";

export type AnalyticsPayload = {
  route: string;
  host: string;
  referrer?: string;
  visitorKey: string;
  dailyVisitorKey: string;
  deviceType: AnalyticsDeviceType;
  browser?: string;
};

const VISITOR_STORAGE_KEY = "mames-analytics-visitor";
const LAST_EVENT_STORAGE_KEY = "mames-analytics-last-event";
const DEDUPE_WINDOW_MS = 30_000;
const MAX_ROUTE_LENGTH = 160;

const botPattern =
  /bot|crawler|spider|crawling|preview|facebookexternalhit|slurp|bingpreview|duckduckbot|baiduspider|yandex|semrush|ahrefs|pingdom/i;

const stagingHostPattern = /(^|\.)staging\.|staging-|preview-|-git-/i;
const internalRoutePattern = /^\/admin(?:\/|$)|^\/api\/admin(?:\/|$)/i;

export const getAnalyticsDayKey = (date = new Date()) => date.toISOString().slice(0, 10);

export const normalizeAnalyticsRoute = (pathname: string) => {
  const cleanPath = pathname.split("?")[0].split("#")[0] || "/";
  const normalizedPath = cleanPath.length > 1 ? cleanPath.replace(/\/+$/, "") : cleanPath;

  return normalizedPath.slice(0, MAX_ROUTE_LENGTH);
};

export const isAnalyticsExcludedHost = (host: string) => {
  const normalizedHost = host.toLowerCase();

  return (
    normalizedHost === "localhost" ||
    normalizedHost.startsWith("localhost:") ||
    normalizedHost === "127.0.0.1" ||
    normalizedHost.startsWith("127.0.0.1:") ||
    normalizedHost === "0.0.0.0" ||
    normalizedHost.startsWith("0.0.0.0:") ||
    normalizedHost.endsWith(".local") ||
    stagingHostPattern.test(normalizedHost)
  );
};

export const shouldTrackAnalytics = ({
  host,
  route,
  userAgent,
}: {
  host: string;
  route: string;
  userAgent: string;
}) => {
  if (!host || isAnalyticsExcludedHost(host)) {
    return false;
  }

  if (!route || internalRoutePattern.test(route)) {
    return false;
  }

  return !botPattern.test(userAgent);
};

export const getDeviceType = (userAgent: string): AnalyticsDeviceType => {
  if (botPattern.test(userAgent)) {
    return "bot";
  }

  if (/ipad|tablet|kindle|silk/i.test(userAgent)) {
    return "tablet";
  }

  if (/mobi|iphone|android/i.test(userAgent)) {
    return "mobile";
  }

  return userAgent ? "desktop" : "unknown";
};

export const getBrowserName = (userAgent: string) => {
  if (/edg\//i.test(userAgent)) {
    return "Edge";
  }

  if (/opr\//i.test(userAgent)) {
    return "Opera";
  }

  if (/chrome|crios/i.test(userAgent) && !/edg\//i.test(userAgent)) {
    return "Chrome";
  }

  if (/firefox|fxios/i.test(userAgent)) {
    return "Firefox";
  }

  if (/safari/i.test(userAgent) && !/chrome|crios|android/i.test(userAgent)) {
    return "Safari";
  }

  return userAgent ? "Other" : undefined;
};

export const sanitizeReferrer = (referrer: string, currentOrigin: string) => {
  if (!referrer) {
    return undefined;
  }

  try {
    const url = new URL(referrer);

    if (url.origin === currentOrigin) {
      return normalizeAnalyticsRoute(url.pathname);
    }

    return url.hostname.slice(0, 120);
  } catch {
    return undefined;
  }
};

const getOrCreateVisitorId = () => {
  const existingId = window.localStorage.getItem(VISITOR_STORAGE_KEY);

  if (existingId) {
    return existingId;
  }

  const visitorId = crypto.randomUUID();
  window.localStorage.setItem(VISITOR_STORAGE_KEY, visitorId);

  return visitorId;
};

const hashValue = async (value: string) => {
  const encodedValue = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encodedValue);

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

export const wasRecentlyTracked = (route: string, now = Date.now()) => {
  try {
    const lastEvent = JSON.parse(window.localStorage.getItem(LAST_EVENT_STORAGE_KEY) ?? "null") as {
      route?: string;
      trackedAt?: number;
    } | null;

    return Boolean(lastEvent?.route === route && lastEvent.trackedAt && now - lastEvent.trackedAt < DEDUPE_WINDOW_MS);
  } catch {
    return false;
  }
};

export const rememberTrackedRoute = (route: string, now = Date.now()) => {
  window.localStorage.setItem(
    LAST_EVENT_STORAGE_KEY,
    JSON.stringify({
      route,
      trackedAt: now,
    })
  );
};

export const buildAnalyticsPayload = async (location: Location, documentReferrer: string): Promise<AnalyticsPayload | null> => {
  const route = normalizeAnalyticsRoute(location.pathname);
  const userAgent = window.navigator.userAgent;

  if (/(^|[?&])(analytics_test|internal_test)=1(?:&|$)/i.test(location.search)) {
    return null;
  }

  if (!shouldTrackAnalytics({ host: location.host, route, userAgent })) {
    return null;
  }

  if (wasRecentlyTracked(route)) {
    return null;
  }

  const visitorId = getOrCreateVisitorId();
  const dayKey = getAnalyticsDayKey();
  const visitorKey = await hashValue(visitorId);
  const dailyVisitorKey = await hashValue(`${visitorId}:${dayKey}`);

  return {
    route,
    host: location.host,
    referrer: sanitizeReferrer(documentReferrer, location.origin),
    visitorKey,
    dailyVisitorKey,
    deviceType: getDeviceType(userAgent),
    browser: getBrowserName(userAgent),
  };
};
