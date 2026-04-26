import { v } from "convex/values";
import { action, internalAction, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";

type MarketingDraftDoc = Doc<"marketingDrafts">;
type GenerationMode = "manual" | "social" | "weekly";

const allMarketingPhotoAssets = [
  "src/assets/mini-pies-tray.png",
  "src/assets/product-mini.jpg",
  "src/assets/product-spicy.png",
  "src/assets/product-beef-pork.jpg",
  "src/assets/product-spicy.jpg",
  "src/assets/product-turkey.png",
  "src/assets/product-turkey.jpg",
  "src/assets/hero-meat-pies.png",
  "src/assets/hero-meatpies.jpg",
  "src/assets/mame-kitchen-1.jpg",
  "src/assets/mame-kitchen-2.jpg",
  "src/assets/mame-portrait-2026.jpg",
  "src/assets/mame-portrait-2026 2.jpg",
];

const getAdminAccess = (adminKey: string) => {
  const configuredKey = process.env.ADMIN_PORTAL_KEY;

  if (!configuredKey) {
    return "missing" as const;
  }

  if (adminKey !== configuredKey) {
    return "denied" as const;
  }

  return "granted" as const;
};

const buildChannelLabel = (channels: string[]) => channels.slice(0, 2).join(" / ") || "Social";

const summarizeFacts = (facts: string) =>
  facts
    .split(/\n+/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

const buildPreferredAssetHint = (draft: MarketingDraftDoc) => {
  if (draft.assetLinks && draft.assetLinks.length > 0) {
    return "Use the linked asset from the content queue, and pull in any additional relevant photo from the full Mame photo library when needed.";
  }

  if (draft.type === "promotion" || draft.type === "event") {
    return `Use the full photo library for this promotion, prioritizing event, tray, hero, product, and Mame brand shots as needed: ${allMarketingPhotoAssets.join(", ")}.`;
  }

  if (draft.type === "founder-story" || draft.type === "testimonial") {
    return `Lead with the Mame portrait and kitchen photos, but the full library is available: ${allMarketingPhotoAssets.join(", ")}.`;
  }

  return `Use the full photo library and match the visual to the post: ${allMarketingPhotoAssets.join(", ")}.`;
};

const getRunLabel = (mode: GenerationMode) => {
  if (mode === "social") {
    return "Tuesday Social Pack";
  }

  if (mode === "weekly") {
    return "Friday Weekly Notes Pack";
  }

  return "Manual Marketing Pack";
};

const buildFallbackPack = (drafts: MarketingDraftDoc[]) => {
  const sortedDrafts = [...drafts].sort((a, b) => {
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const priorityDelta = priorityOrder[b.priority] - priorityOrder[a.priority];

    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    return b.updatedAt - a.updatedAt;
  });

  const socialDrafts = sortedDrafts
    .filter((draft) => draft.type !== "weekly-update")
    .slice(0, 3)
    .map((draft) => {
      const factLines = summarizeFacts(draft.facts);
      const caption = [
        `${draft.title} brings another taste of Mame's kitchen to the table.`,
        draft.summary,
        factLines.join(" "),
        draft.cta,
      ]
        .filter(Boolean)
        .join(" ");

      return {
        title: draft.title,
        sourceType: draft.type,
        channelLabel: buildChannelLabel(draft.channels),
        caption,
        shortPost: [draft.title, factLines[0], draft.cta].filter(Boolean).join(" • "),
        hashtags: ["#MamesMeatPies", "#CaneRiver", "#SouthernFlavor", `#${draft.type.replace(/-/g, "")}`],
        assetHint: buildPreferredAssetHint(draft),
      };
    });

  const weeklySource = sortedDrafts.find((draft) => draft.type === "weekly-update") ?? sortedDrafts[0];
  const highlights = sortedDrafts.slice(0, 3);
  const weeklyNote = weeklySource
    ? {
        title: `Weekly Notes: ${weeklySource.title}`,
        body: [
          `${weeklySource.title} gave us a strong story to share this week.`,
          ...highlights.map((draft) => `- ${draft.summary}${draft.cta ? ` ${draft.cta}` : ""}`),
          "We're carrying that same handcrafted energy into next week with more stories, events, and fresh content.",
        ].join("\n\n"),
        recapPost: `This week at Mame's Meat Pies: ${highlights.map((draft) => draft.title).join(", ")}.`,
        followUps: highlights.map((draft) => `Turn "${draft.title}" into a follow-up post for ${draft.channels[0] ?? "social"}.`),
      }
    : null;

  return {
    provider: "template-fallback",
    generatedAt: Date.now(),
    socialDrafts,
    weeklyNote,
  };
};

const shapePackForMode = <
  T extends {
    provider: string;
    generatedAt: number;
    socialDrafts: Array<{
      title: string;
      sourceType?: string;
      channelLabel: string;
      caption: string;
      shortPost: string;
      hashtags: string[];
      assetHint: string;
    }>;
    weeklyNote: {
      title: string;
      body: string;
      recapPost: string;
      followUps: string[];
    } | null;
  },
>(
  pack: T,
  mode: GenerationMode
) => {
  if (mode === "social") {
    return {
      ...pack,
      socialDrafts: pack.socialDrafts.slice(0, 3),
      weeklyNote: null,
    };
  }

  if (mode === "weekly") {
    return {
      ...pack,
      socialDrafts: [],
      weeklyNote: pack.weeklyNote,
    };
  }

  return pack;
};

const buildPrompt = (drafts: MarketingDraftDoc[]) => {
  const items = drafts.map((draft) => ({
    title: draft.title,
    type: draft.type,
    summary: draft.summary,
    facts: draft.facts,
    cta: draft.cta ?? "",
    channels: draft.channels,
    priority: draft.priority,
    approvalStatus: draft.approvalStatus,
    publishBy: draft.publishBy ?? "",
    notes: draft.notes ?? "",
  }));

  return `
You are the marketing and communications agent for Mame's Meat Pies.

Brand anchors:
- Cane River, Louisiana roots
- Houston, Texas presence
- family recipe heritage
- handcrafted meat pies
- bold Southern flavor
- premium ingredients
- 3-time Natchitoches Meat Pie Festival champion

Rules:
- do not invent facts
- do not add promotions, locations, or dates unless explicitly provided
- keep copy warm, vivid, grounded, and appetizing
- avoid corporate or generic startup language
- write concise, publishable drafts
- use all available photo assets in the repo when recommending visuals
- for promotions and event posts, prefer the most visually relevant photo from the full library
- available images in the repo are:
${allMarketingPhotoAssets.map((asset) => `  - ${asset}`).join("\n")}

Return valid JSON with this shape:
{
  "socialDrafts": [
    {
      "title": "string",
      "sourceType": "string",
      "channelLabel": "string",
      "caption": "string",
      "shortPost": "string",
      "hashtags": ["#tag"],
      "assetHint": "string"
    }
  ],
  "weeklyNote": {
    "title": "string",
    "body": "string",
    "recapPost": "string",
    "followUps": ["string"]
  }
}

Use the queue below as the only source of truth:
${JSON.stringify(items, null, 2)}
`.trim();
};

export const listGeneratedPacksForAdmin = query({
  args: {
    adminKey: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        packs: [],
      };
    }

    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);
    const packs = await ctx.db
      .query("marketingGeneratedPacks")
      .withIndex("by_generatedAt")
      .order("desc")
      .take(limit);

    return {
      access,
      packs,
    };
  },
});

export const listLatestGeneratedPacksInternal = internalQuery({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 20, 1), 100);

    return await ctx.db
      .query("marketingGeneratedPacks")
      .withIndex("by_generatedAt")
      .order("desc")
      .take(limit);
  },
});

export const saveGeneratedPackInternal = internalMutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const packId = await ctx.db.insert("marketingGeneratedPacks", args);

    await ctx.runMutation(internal.marketingOutputs.saveGeneratedFromPackInternal, {
      packId,
      provider: args.provider,
      runLabel: args.runLabel,
      socialDrafts: args.socialDrafts,
      weeklyNote: args.weeklyNote,
    });

    return packId;
  },
});

export const generateForAdmin = action({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        provider: null,
        generatedAt: null,
        socialDrafts: [],
        weeklyNote: null,
      };
    }

    const drafts: MarketingDraftDoc[] = await ctx.runQuery(internal.marketingDrafts.listLatestInternal, { limit: 100 });
    const sourceDrafts = drafts.filter((draft) => draft.approvalStatus !== "draft");

    if (sourceDrafts.length === 0) {
      return {
        access,
        runLabel: getRunLabel("manual"),
        provider: "none",
        generatedAt: Date.now(),
        socialDrafts: [],
        weeklyNote: null,
      };
    }

    const fallbackPack = shapePackForMode(buildFallbackPack(sourceDrafts), "manual");
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MARKETING_MODEL ?? "gpt-5.4-mini";

    if (!apiKey) {
      const pack = {
        access,
        runLabel: getRunLabel("manual"),
        ...fallbackPack,
      };
      await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
        runLabel: pack.runLabel,
        provider: pack.provider,
        generatedAt: pack.generatedAt,
        sourceCount: sourceDrafts.length,
        socialDrafts: pack.socialDrafts,
        weeklyNote: pack.weeklyNote,
      });
      return pack;
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: buildPrompt(sourceDrafts),
          text: {
            format: {
              type: "json_object",
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI response failed: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as { output_text?: string };
      const parsed = JSON.parse(data.output_text ?? "{}") as {
        socialDrafts?: Array<{
          title: string;
          sourceType: string;
          channelLabel: string;
          caption: string;
          shortPost: string;
          hashtags: string[];
          assetHint: string;
        }>;
        weeklyNote?: {
          title: string;
          body: string;
          recapPost: string;
          followUps: string[];
        } | null;
      };

      const pack = {
        access,
        runLabel: getRunLabel("manual"),
        provider: model,
        generatedAt: Date.now(),
        ...shapePackForMode(
          {
            provider: model,
            generatedAt: Date.now(),
            socialDrafts: parsed.socialDrafts ?? fallbackPack.socialDrafts,
            weeklyNote: parsed.weeklyNote ?? fallbackPack.weeklyNote,
          },
          "manual"
        ),
      };
      await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
        runLabel: pack.runLabel,
        provider: pack.provider,
        generatedAt: pack.generatedAt,
        sourceCount: sourceDrafts.length,
        socialDrafts: pack.socialDrafts.map((draft) => ({
          title: draft.title,
          sourceType: draft.sourceType,
          channelLabel: draft.channelLabel,
          caption: draft.caption,
          shortPost: draft.shortPost,
          hashtags: draft.hashtags,
          assetHint: draft.assetHint,
        })),
        weeklyNote: pack.weeklyNote,
      });
      return pack;
    } catch (error) {
      console.error(error);
      const pack = {
        access,
        runLabel: getRunLabel("manual"),
        ...fallbackPack,
      };
      await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
        runLabel: pack.runLabel,
        provider: pack.provider,
        generatedAt: pack.generatedAt,
        sourceCount: sourceDrafts.length,
        socialDrafts: pack.socialDrafts,
        weeklyNote: pack.weeklyNote,
      });
      return pack;
    }
  },
});

export const generateScheduledPack = internalAction({
  args: {
    mode: v.union(v.literal("social"), v.literal("weekly")),
  },
  handler: async (ctx, args) => {
    const drafts: MarketingDraftDoc[] = await ctx.runQuery(internal.marketingDrafts.listLatestInternal, { limit: 100 });
    const sourceDrafts = drafts.filter((draft) => draft.approvalStatus !== "draft");

    if (sourceDrafts.length === 0) {
      return {
        ok: true,
        skipped: true,
      };
    }

    const fallbackPack = shapePackForMode(buildFallbackPack(sourceDrafts), args.mode);
    const apiKey = process.env.OPENAI_API_KEY;
    const model = process.env.OPENAI_MARKETING_MODEL ?? "gpt-5.4-mini";

    if (!apiKey) {
      await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
        runLabel: getRunLabel(args.mode),
        provider: fallbackPack.provider,
        generatedAt: fallbackPack.generatedAt,
        sourceCount: sourceDrafts.length,
        socialDrafts: fallbackPack.socialDrafts,
        weeklyNote: fallbackPack.weeklyNote,
      });

      return {
        ok: true,
        skipped: false,
      };
    }

    try {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          input: buildPrompt(sourceDrafts),
          text: {
            format: {
              type: "json_object",
            },
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI response failed: ${response.status} ${errorText}`);
      }

      const data = (await response.json()) as { output_text?: string };
      const parsed = JSON.parse(data.output_text ?? "{}") as {
        socialDrafts?: Array<{
          title: string;
          sourceType: string;
          channelLabel: string;
          caption: string;
          shortPost: string;
          hashtags: string[];
          assetHint: string;
        }>;
        weeklyNote?: {
          title: string;
          body: string;
          recapPost: string;
          followUps: string[];
        } | null;
      };

      const pack = shapePackForMode(
        {
          provider: model,
          generatedAt: Date.now(),
          socialDrafts: parsed.socialDrafts ?? fallbackPack.socialDrafts,
          weeklyNote: parsed.weeklyNote ?? fallbackPack.weeklyNote,
        },
        args.mode
      );

      await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
        runLabel: getRunLabel(args.mode),
        provider: pack.provider,
        generatedAt: pack.generatedAt,
        sourceCount: sourceDrafts.length,
        socialDrafts: pack.socialDrafts.map((draft) => ({
          title: draft.title,
          sourceType: draft.sourceType ?? "",
          channelLabel: draft.channelLabel,
          caption: draft.caption,
          shortPost: draft.shortPost,
          hashtags: draft.hashtags,
          assetHint: draft.assetHint,
        })),
        weeklyNote: pack.weeklyNote,
      });

      return {
        ok: true,
        skipped: false,
      };
    } catch (error) {
      console.error(error);
      await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
        runLabel: getRunLabel(args.mode),
        provider: fallbackPack.provider,
        generatedAt: fallbackPack.generatedAt,
        sourceCount: sourceDrafts.length,
        socialDrafts: fallbackPack.socialDrafts,
        weeklyNote: fallbackPack.weeklyNote,
      });

      return {
        ok: true,
        skipped: false,
      };
    }
  },
});

export const seedSampleQueueForAdmin = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        inserted: 0,
      };
    }

    const existing = await ctx.db.query("marketingDrafts").withIndex("by_updatedAt").take(1);

    if (existing.length > 0) {
      return {
        access,
        inserted: 0,
      };
    }

    const now = Date.now();
    const sampleRows = [
      {
        title: "Downtown market pop-up this Saturday",
        type: "event" as const,
        summary: "We're setting up at the downtown market with classic beef and pork pies plus mini pies for easy snacking.",
        facts: "Saturday pop-up\nDowntown market booth\nClassic beef and pork pies\nMini pies available",
        cta: "Stop by early before the minis are gone.",
        channels: ["Instagram", "Facebook"],
        assetLinks: ["src/assets/mame-kitchen-1.jpg", "src/assets/mame-kitchen-2.jpg"],
        priority: "high" as const,
        publishBy: "",
        approvalStatus: "ready" as const,
        notes: "Lead with the community feel and the weekend energy. Use a Mame cart or kitchen photo.",
      },
      {
        title: "Mini pies are party-ready",
        type: "promotion" as const,
        summary: "Our mini pies are built for showers, office lunches, game nights, and family gatherings.",
        facts: "Mini beef and pork pies\nSold in packs of 12\nGreat for parties and events",
        cta: "Call 800-318-7135 to plan your next order.",
        channels: ["Instagram", "Website Notes", "Email"],
        assetLinks: ["src/assets/mame-kitchen-2.jpg", "src/assets/mame-portrait-2026.jpg"],
        priority: "medium" as const,
        publishBy: "",
        approvalStatus: "approved" as const,
        notes: "Use Mame cart or kitchen imagery first, then tray photos if needed.",
      },
      {
        title: "A week rooted in Mame's recipe",
        type: "weekly-update" as const,
        summary: "This week we focused on fresh batches, local conversations, and sharing the family recipe with new customers.",
        facts: "Fresh weekly batches\nLocal customer conversations\nFamily recipe story remains central",
        cta: "Keep an eye out for next week's pop-up reminder.",
        channels: ["Website Notes", "Facebook", "Email"],
        assetLinks: [],
        priority: "medium" as const,
        publishBy: "",
        approvalStatus: "ready" as const,
        notes: "Warm, reflective tone for Friday notes.",
      },
    ];

    for (const row of sampleRows) {
      await ctx.db.insert("marketingDrafts", {
        ...row,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      access,
      inserted: sampleRows.length,
    };
  },
});

export const importBellPhotoPromoForAdmin = mutation({
  args: {
    adminKey: v.string(),
  },
  handler: async (ctx, args) => {
    const access = getAdminAccess(args.adminKey);

    if (access !== "granted") {
      return {
        access,
        inserted: 0,
      };
    }

    const existingBellPromo = await ctx.db
      .query("marketingDrafts")
      .withIndex("by_updatedAt")
      .take(100);

    if (existingBellPromo.some((draft) => draft.title.toLowerCase().includes("bell-ringing"))) {
      return {
        access,
        inserted: 0,
      };
    }

    const now = Date.now();
    const sourceImage = "/Users/chadsteward/Downloads/Ringing Bell T and Customer.jpg";

    const draftRows = [
      {
        title: "Bell-ringing good Facebook post",
        type: "promotion" as const,
        summary: "Community-driven promo built from the bell-ringing customer moment at an event.",
        facts:
          "Customer ringing a bell after trying Mame's Meat Pies at an event\nCommunity event setting\nStrong customer reaction and excitement\nFamily-recipe brand story and bold Southern flavor",
        cta: "Call 800-318-7135 for orders, events, and party trays.",
        channels: ["Facebook"],
        assetLinks: [sourceImage, "src/assets/mini-pies-tray.png", "src/assets/product-beef-pork.jpg"],
        priority: "high" as const,
        publishBy: undefined,
        approvalStatus: "ready" as const,
        notes: "Lead with the bell-ringing moment and community energy.",
      },
      {
        title: "Bell-ringing good Instagram caption",
        type: "promotion" as const,
        summary: "Instagram promo centered on the customer reaction photo and event energy.",
        facts:
          "Bell-ringing customer reaction photo\nEvent crowd and live community setting\nHandmade pies rooted in family tradition",
        cta: "Call 800-318-7135 for orders and event bookings.",
        channels: ["Instagram"],
        assetLinks: [sourceImage, "src/assets/mame-kitchen-2.jpg", "src/assets/product-beef-pork.jpg"],
        priority: "high" as const,
        publishBy: undefined,
        approvalStatus: "ready" as const,
        notes: "Keep it punchy and visual. Bell-ringing should be the hook.",
      },
      {
        title: "Bell-ringing story sequence",
        type: "event" as const,
        summary: "Four-frame Instagram/Facebook Story built from the live event photo.",
        facts: "Live event moment\nBell-ringing customer reaction\nStrong local and community feel\nOrder phone number available",
        cta: "Catch us at the next pop-up. Order: 800-318-7135.",
        channels: ["Instagram", "Facebook"],
        assetLinks: [sourceImage],
        priority: "high" as const,
        publishBy: undefined,
        approvalStatus: "ready" as const,
        notes: "Can be split into four story frames with text overlays.",
      },
      {
        title: "Weekly notes bell-ringing recap",
        type: "weekly-update" as const,
        summary: "Weekly notes entry built around the customer bell-ringing moment.",
        facts:
          "Customer rang the bell after enjoying Mame's Meat Pies at an event\nMoment reflects strong community response\nSupports brand themes of family tradition and bold Southern flavor",
        cta: "Watch for our next pop-up and weekly update.",
        channels: ["Website Notes", "Email", "Facebook"],
        assetLinks: [sourceImage, "src/assets/mame-kitchen-2.jpg"],
        priority: "medium" as const,
        publishBy: undefined,
        approvalStatus: "ready" as const,
        notes: "Warm, reflective weekly voice.",
      },
    ];

    for (const row of draftRows) {
      await ctx.db.insert("marketingDrafts", {
        ...row,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.runMutation(internal.marketingGenerator.saveGeneratedPackInternal, {
      runLabel: "Bell Photo Promo Pack",
      provider: "manual-import",
      generatedAt: now,
      sourceCount: draftRows.length,
      socialDrafts: [
        {
          title: "When the meat pie is so good, you have to ring the bell",
          sourceType: "promotion",
          channelLabel: "Facebook",
          caption:
            "When the meat pie is so good, you have to ring the bell.\n\nThis is the kind of moment we love sharing with our community. Mame's Meat Pies brings bold Southern flavor, family-recipe tradition, and the kind of food that keeps folks smiling from the first bite to the last.\n\nIf you catch us out at a pop-up or community event, come hungry and stop by early. Our favorites do not last long.\n\nCall 800-318-7135 for orders, events, and party trays.",
          shortPost: "Bell-ringing good. Catch us at the next pop-up.",
          hashtags: ["#MamesMeatPies", "#CaneRiver", "#SouthernFlavor"],
          assetHint: "Use the bell-ringing customer photo as the lead image. Pair with tray or product photos in follow-up posts.",
        },
        {
          title: "Bell-ringing good",
          sourceType: "promotion",
          channelLabel: "Instagram",
          caption:
            "Bell-ringing good.\n\nNothing makes us happier than seeing people enjoy Mame's Meat Pies in real time. Handmade, flavorful, and rooted in family tradition, every pie is made to bring people together.\n\nIf you see us at the next event, come by and grab your favorites early.\n\nCall 800-318-7135 for orders and event bookings.",
          shortPost: "Bell-ringing good. Handmade flavor rooted in tradition.",
          hashtags: ["#MamesMeatPies", "#CaneRiver", "#SouthernFlavor", "#HoustonEats", "#LouisianaFlavor"],
          assetHint: "Lead with the bell-ringing customer image. Use Mame kitchen or product photos in a carousel if desired.",
        },
        {
          title: "Bell-ringing story sequence",
          sourceType: "event",
          channelLabel: "Instagram / Facebook",
          caption:
            "Frame 1: Bell-ringing good\nFrame 2: One bite and she knew\nFrame 3: Bold Southern flavor. Made from Mame's recipe.\nFrame 4: Catch us at the next pop-up. Order: 800-318-7135.",
          shortPost: "Bell-ringing good • One bite and she knew • Catch us at the next pop-up",
          hashtags: ["#MamesMeatPies", "#CaneRiver", "#SouthernFlavor"],
          assetHint: "Use the same bell-ringing photo across the sequence or mix it with tray and hero shots.",
        },
      ],
      weeklyNote: {
        title: "Weekly Notes: Bell-ringing good",
        body:
          "One of our favorite moments this week was seeing a customer ring the bell after enjoying Mame's Meat Pies at an event. It was a fun reminder of why we do this: bringing people together with bold Southern flavor, family tradition, and food that makes a real impression. Moments like that keep us excited for the next pop-up, the next order, and the next table we get to serve.",
        recapPost:
          "This week at Mame's Meat Pies: one bell-ringing customer moment reminded us why we love serving this community.",
        followUps: [
          "Use the bell-ringing photo for a weekend event promo.",
          "Turn the customer reaction into a short Facebook testimonial post.",
          "Pair the story sequence with tray and hero images for a carousel follow-up.",
        ],
      },
    });

    return {
      access,
      inserted: draftRows.length,
    };
  },
});
