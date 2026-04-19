import { mutation } from "./_generated/server";
import { v } from "convex/values";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const subscribe = mutation({
  args: {
    name: v.optional(v.string()),
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = args.name?.trim();
    const email = normalizeEmail(args.email);
    const now = Date.now();
    const existingSubscriber = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingSubscriber) {
      const updates: {
        name?: string;
        source: string;
        status: "subscribed";
        updatedAt: number;
      } = {
        source: args.source ?? existingSubscriber.source,
        status: "subscribed",
        updatedAt: now,
      };

      if (name) {
        updates.name = name;
      }

      await ctx.db.patch(existingSubscriber._id, {
        ...updates,
      });

      return {
        subscriberId: existingSubscriber._id,
        alreadySubscribed: true,
      };
    }

    const subscriberId = await ctx.db.insert("newsletterSubscribers", {
      ...(name ? { name } : {}),
      email,
      source: args.source ?? "website",
      status: "subscribed",
      createdAt: now,
      updatedAt: now,
    });

    return {
      subscriberId,
      alreadySubscribed: false,
    };
  },
});
