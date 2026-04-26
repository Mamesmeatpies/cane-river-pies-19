import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  analyticsEvents: defineTable({
    route: v.string(),
    host: v.string(),
    referrer: v.optional(v.string()),
    visitorKey: v.string(),
    dailyVisitorKey: v.string(),
    day: v.string(),
    deviceType: v.union(
      v.literal("desktop"),
      v.literal("mobile"),
      v.literal("tablet"),
      v.literal("bot"),
      v.literal("unknown")
    ),
    browser: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_day", ["day"])
    .index("by_route", ["route"])
    .index("by_visitor_route_createdAt", ["visitorKey", "route", "createdAt"]),
  contactMessages: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),
  marketingDrafts: defineTable({
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
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_approvalStatus_and_updatedAt", ["approvalStatus", "updatedAt"]),
  marketingGeneratedPacks: defineTable({
    runLabel: v.string(),
    provider: v.string(),
    generatedAt: v.number(),
    sourceCount: v.number(),
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
  }).index("by_generatedAt", ["generatedAt"]),
  marketingOutputs: defineTable({
    packId: v.optional(v.id("marketingGeneratedPacks")),
    kind: v.union(v.literal("social"), v.literal("weekly-note")),
    title: v.string(),
    channelLabel: v.string(),
    body: v.string(),
    shortPost: v.optional(v.string()),
    hashtags: v.optional(v.array(v.string())),
    assetHint: v.string(),
    selectedAssets: v.array(v.string()),
    sourceType: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("approved"), v.literal("scheduled"), v.literal("posted")),
    publishAt: v.optional(v.string()),
    provider: v.string(),
    runLabel: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_updatedAt", ["updatedAt"])
    .index("by_status_and_updatedAt", ["status", "updatedAt"]),
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
    subtotal: v.optional(v.number()),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
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
