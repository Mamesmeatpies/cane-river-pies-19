import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const platformValidator = v.union(
  v.literal("instagram"),
  v.literal("facebook"),
  v.literal("website"),
  v.literal("other")
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

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    platform: platformValidator,
    handle: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("directMessages", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

export const listForAdmin = query({
  args: {
    adminKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        directMessages: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 1000);
    const directMessages = await ctx.db
      .query("directMessages")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    return {
      access,
      directMessages,
    };
  },
});

export const listLatestInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 1000);

    return await ctx.db
      .query("directMessages")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});
