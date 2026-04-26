import { internalMutation, internalQuery, mutation, query } from "./_generated/server";
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

const marketingOutputFields = {
  title: v.string(),
  channelLabel: v.string(),
  body: v.string(),
  shortPost: v.optional(v.string()),
  hashtags: v.optional(v.array(v.string())),
  assetHint: v.string(),
  selectedAssets: v.array(v.string()),
  status: v.union(v.literal("draft"), v.literal("approved"), v.literal("scheduled"), v.literal("posted")),
  publishAt: v.optional(v.string()),
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
        outputs: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 250);
    const outputs = await ctx.db
      .query("marketingOutputs")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);

    return {
      access,
      outputs,
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
      .query("marketingOutputs")
      .withIndex("by_updatedAt")
      .order("desc")
      .take(limit);
  },
});

export const saveGeneratedFromPackInternal = internalMutation({
  args: {
    packId: v.id("marketingGeneratedPacks"),
    provider: v.string(),
    runLabel: v.string(),
    socialDrafts: v.array(
      v.object({
        title: v.string(),
        sourceType: v.string(),
        channelLabel: v.string(),
        caption: v.string(),
        shortPost: v.string(),
        hashtags: v.array(v.string()),
        assetHint: v.string(),
      })
    ),
    weeklyNote: v.union(
      v.null(),
      v.object({
        title: v.string(),
        body: v.string(),
        recapPost: v.string(),
        followUps: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const draft of args.socialDrafts) {
      await ctx.db.insert("marketingOutputs", {
        packId: args.packId,
        kind: "social",
        title: draft.title,
        channelLabel: draft.channelLabel,
        body: draft.caption,
        shortPost: draft.shortPost,
        hashtags: draft.hashtags,
        assetHint: draft.assetHint,
        selectedAssets: [],
        sourceType: draft.sourceType,
        status: "draft",
        provider: args.provider,
        runLabel: args.runLabel,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (args.weeklyNote) {
      await ctx.db.insert("marketingOutputs", {
        packId: args.packId,
        kind: "weekly-note",
        title: args.weeklyNote.title,
        channelLabel: "Website Notes / Email",
        body: args.weeklyNote.body,
        shortPost: args.weeklyNote.recapPost,
        hashtags: [],
        assetHint: "Use the strongest mix of brand, hero, kitchen, and product images that support the weekly story.",
        selectedAssets: [],
        sourceType: "weekly-update",
        status: "draft",
        provider: args.provider,
        runLabel: args.runLabel,
        createdAt: now,
        updatedAt: now,
      });
    }

    return null;
  },
});

export const updateForAdmin = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("marketingOutputs"),
    output: v.object(marketingOutputFields),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
      };
    }

    await ctx.db.patch(args.id, {
      ...args.output,
      updatedAt: Date.now(),
    });

    return {
      access,
    };
  },
});
