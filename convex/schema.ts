import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  directMessages: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    platform: v.union(v.literal("instagram"), v.literal("facebook"), v.literal("website"), v.literal("other")),
    handle: v.optional(v.string()),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  newsletterSubscribers: defineTable({
    name: v.optional(v.string()),
    email: v.string(),
    source: v.string(),
    status: v.union(v.literal("subscribed"), v.literal("unsubscribed")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_createdAt", ["createdAt"]),
  orders: defineTable({
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
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  products: defineTable({
    productId: v.string(),
    name: v.string(),
    sku: v.string(),
    description: v.string(),
    category: v.string(),
    price: v.number(),
    cost: v.optional(v.number()),
    stock: v.number(),
    inventoryThreshold: v.optional(v.number()),
    status: v.union(v.literal("active"), v.literal("draft"), v.literal("low_stock")),
    variants: v.optional(v.array(v.string())),
    imageKey: v.string(),
    imageUploadName: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_productId", ["productId"])
    .index("by_status", ["status"]),
});
