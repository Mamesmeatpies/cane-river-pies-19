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
    subtotal: v.optional(v.number()),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Cannot create an order with no items.");
    }

    if (args.status === "submitted") {
      const quantitiesByProductId = new Map<string, number>();

      for (const item of args.items) {
        quantitiesByProductId.set(item.productId, (quantitiesByProductId.get(item.productId) ?? 0) + item.quantity);
      }

      for (const [productId, quantity] of quantitiesByProductId) {
        const product = await ctx.db
          .query("products")
          .withIndex("by_productId", (q) => q.eq("productId", productId))
          .unique();

        if (!product) {
          throw new Error(`Inventory item not found for product ${productId}.`);
        }

        if (product.stock < quantity) {
          throw new Error(`Not enough inventory for ${product.name}.`);
        }

        const nextStock = product.stock - quantity;
        const threshold = product.inventoryThreshold ?? 10;

        await ctx.db.patch(product._id, {
          stock: nextStock,
          status: nextStock <= threshold ? "low_stock" : "active",
          updatedAt: Date.now(),
        });
      }
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

    const limit = Math.min(Math.max(args.limit ?? 100, 1), 1000);
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

export const listLatestInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 100, 1), 1000);

    return await ctx.db
      .query("orders")
      .withIndex("by_createdAt")
      .order("desc")
      .take(limit);
  },
});
