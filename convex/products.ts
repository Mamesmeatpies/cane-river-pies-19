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

const productFields = {
  productId: v.string(),
  name: v.string(),
  sku: v.string(),
  description: v.string(),
  category: v.string(),
  price: v.number(),
  stock: v.number(),
  status: v.union(v.literal("active"), v.literal("draft"), v.literal("low_stock")),
  imageKey: v.string(),
};

const defaultProducts = [
  {
    productId: "beef-pork",
    name: "Beef & Pork Meat Pie",
    sku: "MAME-BP-DOZ",
    description: "Our classic Cane River recipe with premium seasoned beef and pork in a golden, flaky crust.",
    category: "Full Size",
    price: 30,
    stock: 48,
    status: "active" as const,
    imageKey: "beef-pork",
  },
  {
    productId: "spicy",
    name: "Beef & Pork Spicy",
    sku: "MAME-SP-DOZ",
    description: "The classic turned up with Cajun heat - bold spices wrapped in golden pastry perfection.",
    category: "Full Size",
    price: 30,
    stock: 22,
    status: "active" as const,
    imageKey: "spicy",
  },
  {
    productId: "turkey",
    name: "Turkey Meat Pie",
    sku: "MAME-TK-DOZ",
    description: "A lighter twist on tradition - seasoned turkey in a handcrafted flaky crust.",
    category: "Full Size",
    price: 30,
    stock: 16,
    status: "active" as const,
    imageKey: "turkey",
  },
  {
    productId: "mini",
    name: "Mini Beef & Pork Pies",
    sku: "MAME-MINI-12",
    description: "Bite-sized perfection - sold in packs of 12. Ideal for parties, events, and snacking.",
    category: "Mini - Pack of 12",
    price: 20,
    stock: 8,
    status: "low_stock" as const,
    imageKey: "mini",
  },
];

export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const products = await ctx.db.query("products").collect();

    return products
      .filter((product) => product.status !== "draft")
      .sort((a, b) => a.createdAt - b.createdAt);
  },
});

export const listForAdmin = query({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        products: [],
      };
    }

    const products = await ctx.db.query("products").collect();

    return {
      access,
      products: products.sort((a, b) => a.createdAt - b.createdAt),
    };
  },
});

export const createForAdmin = mutation({
  args: {
    adminKey: v.string(),
    product: v.object(productFields),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        productId: null,
      };
    }

    const existing = await ctx.db
      .query("products")
      .withIndex("by_productId", (q) => q.eq("productId", args.product.productId))
      .unique();

    if (existing) {
      throw new Error("A product with that product ID already exists.");
    }

    const now = Date.now();
    const productId = await ctx.db.insert("products", {
      ...args.product,
      createdAt: now,
      updatedAt: now,
    });

    return {
      access,
      productId,
    };
  },
});

export const updateForAdmin = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("products"),
    product: v.object(productFields),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
      };
    }

    await ctx.db.patch(args.id, {
      ...args.product,
      updatedAt: Date.now(),
    });

    return {
      access,
    };
  },
});

export const seedDefaultProducts = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        seeded: 0,
      };
    }

    let seeded = 0;

    for (const product of defaultProducts) {
      const existing = await ctx.db
        .query("products")
        .withIndex("by_productId", (q) => q.eq("productId", product.productId))
        .unique();

      if (!existing) {
        const now = Date.now();
        await ctx.db.insert("products", {
          ...product,
          createdAt: now,
          updatedAt: now,
        });
        seeded += 1;
      }
    }

    return {
      access,
      seeded,
    };
  },
});
