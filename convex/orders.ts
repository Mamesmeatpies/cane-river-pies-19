import { internalQuery, mutation, query } from "./_generated/server";
import { v } from "convex/values";

const MINI_PRODUCT_IDS = new Set(["mini", "mini-unfried"]);
const MINI_MINIMUM_DOZENS = 2;
const fulfillmentStatusValidator = v.union(
  v.literal("new"),
  v.literal("confirmed"),
  v.literal("in_kitchen"),
  v.literal("ready"),
  v.literal("completed"),
  v.literal("canceled")
);
const fulfillmentMethodValidator = v.union(
  v.literal("pickup"),
  v.literal("delivery"),
  v.literal("event"),
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

export const create = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.string(),
    preferredContactMethod: v.union(v.literal("email"), v.literal("phone")),
    salesperson: v.optional(v.string()),
    notes: v.optional(v.string()),
    paymentMethod: v.union(v.literal("stripe"), v.literal("email")),
    status: v.union(v.literal("checkout_started"), v.literal("submitted")),
    fulfillmentStatus: v.optional(fulfillmentStatusValidator),
    fulfillmentMethod: v.optional(fulfillmentMethodValidator),
    neededBy: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
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
    promoSource: v.optional(v.string()),
    promoCampaign: v.optional(v.string()),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    if (args.items.length === 0) {
      throw new Error("Cannot create an order with no items.");
    }

    const email = args.email?.trim();
    const phone = args.phone.trim();

    if (!phone) {
      throw new Error("Phone number is required.");
    }

    if (args.preferredContactMethod === "email" && !email) {
      throw new Error("Email is required when email is the preferred contact method.");
    }

    const miniQuantity = args.items
      .filter((item) => MINI_PRODUCT_IDS.has(item.productId))
      .reduce((sum, item) => sum + item.quantity, 0);

    if (miniQuantity > 0 && miniQuantity < MINI_MINIMUM_DOZENS) {
      throw new Error(`Mini pies require a minimum order of ${MINI_MINIMUM_DOZENS} dozen.`);
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

    const now = Date.now();

    return await ctx.db.insert("orders", {
      ...args,
      email,
      phone,
      fulfillmentStatus: args.fulfillmentStatus ?? "new",
      fulfillmentMethod: args.fulfillmentMethod ?? "unknown",
      neededBy: args.neededBy,
      assignedTo: args.assignedTo,
      internalNotes: args.internalNotes,
      lastFulfillmentUpdateAt: now,
      createdAt: now,
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

export const updateFulfillmentForAdmin = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("orders"),
    fulfillmentStatus: fulfillmentStatusValidator,
    fulfillmentMethod: fulfillmentMethodValidator,
    neededBy: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    internalNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
      };
    }

    await ctx.db.patch(args.id, {
      fulfillmentStatus: args.fulfillmentStatus,
      fulfillmentMethod: args.fulfillmentMethod,
      neededBy: args.neededBy,
      assignedTo: args.assignedTo,
      internalNotes: args.internalNotes,
      lastFulfillmentUpdateAt: Date.now(),
    });

    return {
      access,
    };
  },
});
