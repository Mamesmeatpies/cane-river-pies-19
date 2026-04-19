import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { createRemoteJWKSet, jwtVerify } from "jose";

type WorkOSUser = {
  id: string;
  email?: string;
  firstName?: string | null;
  lastName?: string | null;
};

const splitList = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

const getApiHostname = () => process.env.WORKOS_API_HOSTNAME ?? "api.workos.com";

const getJwksUrl = (clientId: string) =>
  process.env.WORKOS_JWKS_URL ?? `https://${getApiHostname()}/sso/jwks/${clientId}`;

const getIssuer = () => process.env.WORKOS_ISSUER ?? `https://${getApiHostname()}/`;

const getWorkOSUser = async (userId: string): Promise<WorkOSUser | null> => {
  const apiKey = process.env.WORKOS_API_KEY;

  if (!apiKey) {
    return null;
  }

  const response = await fetch(`https://${getApiHostname()}/user_management/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(`WorkOS user lookup failed: ${response.status}`);
  }

  return (await response.json()) as WorkOSUser;
};

const verifyWorkOSToken = async (accessToken: string) => {
  const clientId = process.env.WORKOS_CLIENT_ID;

  if (!clientId || !process.env.WORKOS_API_KEY || !process.env.WORKOS_ADMIN_EMAILS) {
    return {
      access: "missing" as const,
      user: null,
    };
  }

  const jwks = createRemoteJWKSet(new URL(getJwksUrl(clientId)));
  const { payload } = await jwtVerify(accessToken, jwks, {
    audience: clientId,
    issuer: getIssuer(),
  });

  const userId = payload.sub;

  if (!userId) {
    return {
      access: "denied" as const,
      user: null,
    };
  }

  const user = await getWorkOSUser(userId);
  const adminEmails = splitList(process.env.WORKOS_ADMIN_EMAILS);
  const email = user?.email?.toLowerCase();

  if (!email || !adminEmails.includes(email)) {
    return {
      access: "denied" as const,
      user,
    };
  }

  return {
    access: "granted" as const,
    user,
  };
};

export const getInboxForAdmin = action({
  args: {
    accessToken: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    try {
      const auth = await verifyWorkOSToken(args.accessToken);

      if (auth.access !== "granted") {
        return {
          access: auth.access,
          user: auth.user,
          messages: [],
          directMessages: [],
          orders: [],
          products: [],
          analytics: null,
        };
      }

      const limit = Math.min(Math.max(args.limit ?? 100, 1), 1000);
      const [messages, directMessages, orders, products, analytics] = await Promise.all([
        ctx.runQuery(internal.contactMessages.listLatestInternal, { limit }),
        ctx.runQuery(internal.directMessages.listLatestInternal, { limit }),
        ctx.runQuery(internal.orders.listLatestInternal, { limit }),
        ctx.runQuery(internal.products.listAllInternal, {}),
        ctx.runQuery(internal.analytics.summaryInternal, {}),
      ]);

      return {
        access: auth.access,
        user: auth.user,
        messages,
        directMessages,
        orders,
        products,
        analytics,
      };
    } catch {
      return {
        access: "denied" as const,
        user: null,
        messages: [],
        directMessages: [],
        orders: [],
        products: [],
        analytics: null,
      };
    }
  },
});
