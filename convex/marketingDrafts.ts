import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

const marketingDraftFields = {
  title: v.string(),
  type: v.union(
    v.literal("product"),
    v.literal("event"),
    v.literal("promotion"),
    v.literal("testimonial"),
    v.literal("founder-story"),
    v.literal("weekly-update")
  ),
  summary: v.string(),
  facts: v.string(),
  cta: v.optional(v.string()),
  channels: v.array(v.string()),
  assetLinks: v.optional(v.array(v.string())),
  priority: v.union(v.literal("high"), v.literal("medium"), v.literal("low")),
  publishBy: v.optional(v.string()),
  approvalStatus: v.union(v.literal("draft"), v.literal("ready"), v.literal("approved"), v.literal("scheduled")),
  notes: v.optional(v.string()),
};

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
        drafts: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 250);
    const drafts = await ctx.db
      .query("marketingDrafts")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);

    return {
      access,
      drafts,
    };
  },
});

export const listLatestInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 250);

    return await ctx.db
      .query("marketingDrafts")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);
  },
});

export const createForAdmin = mutation({
  args: {
    adminKey: v.string(),
    draft: v.object(marketingDraftFields),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        draftId: null,
      };
    }

    const now = Date.now();
    const draftId = await ctx.db.insert("marketingDrafts", {
      ...args.draft,
      createdAt: now,
      updatedAt: now,
    });

    return {
      access,
      draftId,
    };
  },
});

export const updateForAdmin = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("marketingDrafts"),
    draft: v.object(marketingDraftFields),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
      };
    }

    await ctx.db.patch(args.id, {
      ...args.draft,
      updatedAt: Date.now(),
    });

    return {
      access,
    };
  },
});
