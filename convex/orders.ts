import { mutation, query } from "./_generated/server";
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

export const create = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    paymentMethod: v.union(v.literal("stripe"), v.literal("email")),
    status: v.union(v.literal("checkout_started"), v.literal("submitted")),
    items: v.array(
      v.object({
        productId: v.string(),
        name: v.string(),
        unitPrice: v.number(),
        quantity: v.number(),
        lineTotal: v.number(),
      })
    ),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Cannot create an order with no items.");
    }

    return await ctx.db.insert("orders", {
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
        orders: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 200);
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);

    return {
      access,
      orders,
    };
  },
});
