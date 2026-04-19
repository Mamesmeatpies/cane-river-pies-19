import { mutation } from "./_generated/server";
import { v } from "convex/values";

const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const subscribe = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const email = normalizeEmail(args.email);
    const now = Date.now();
    const existingSubscriber = await ctx.db
      .query("newsletterSubscribers")
      .withIndex("by_email", (q) => q.eq("email", email))
      .unique();

    if (existingSubscriber) {
      await ctx.db.patch(existingSubscriber._id, {
        source: args.source ?? existingSubscriber.source,
        status: "subscribed",
        updatedAt: now,
      });

      return {
        subscriberId: existingSubscriber._id,
        alreadySubscribed: true,
      };
    }

    const subscriberId = await ctx.db.insert("newsletterSubscribers", {
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
