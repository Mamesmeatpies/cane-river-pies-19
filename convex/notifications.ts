import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const notificationEmail = process.env.RESEND_TO_EMAIL ?? "mamesmeatpies@gmail.com";

const orderItemValidator = v.object({
  productId: v.string(),
  name: v.string(),
  unitPrice: v.number(),
  quantity: v.number(),
  lineTotal: v.number(),
});

const directMessagePlatformValidator = v.union(
  v.literal("instagram"),
  v.literal("facebook"),
  v.literal("website"),
  v.literal("other")
);

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

const textToHtml = (value: string) => escapeHtml(value).replace(/\n/g, "<br />");

const sendResendEmail = async ({
  to,
  subject,
  text,
  replyTo,
}: {
  to: string[];
  subject: string;
  text: string;
  replyTo: string;
}) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !from) {
    throw new Error("Resend is missing RESEND_API_KEY or RESEND_FROM_EMAIL.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.5">${textToHtml(text)}</div>`,
      reply_to: replyTo,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Resend email failed: ${response.status} ${errorText}`);
  }
};

const trySendResendEmail = async (email: Parameters<typeof sendResendEmail>[0]) => {
  try {
    await sendResendEmail(email);
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
};

const sendAdminEmail = (email: Omit<Parameters<typeof sendResendEmail>[0], "to">) =>
  trySendResendEmail({
    ...email,
    to: [notificationEmail],
  });

const sendCustomerEmail = (email: string, message: Omit<Parameters<typeof sendResendEmail>[0], "to" | "replyTo">) =>
  trySendResendEmail({
    ...message,
    to: [email],
    replyTo: notificationEmail,
  });

export const submitContactMessage = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.runMutation(api.contactMessages.create, args);
    const phone = args.phone ?? "Not provided";

    const notificationSent = await sendAdminEmail({
      subject: `New contact message from ${args.name}`,
      replyTo: args.email,
      text: [
        `New contact message from ${args.name}`,
        `Email: ${args.email}`,
        `Phone: ${phone}`,
        "",
        "Message:",
        args.message,
      ].join("\n"),
    });

    const customerEmailSent = await sendCustomerEmail(args.email, {
      subject: "We received your message",
      text: [
        `Hi ${args.name},`,
        "",
        "Thanks for reaching out to Mame's Meat Pies. We received your message and will follow up soon.",
        "",
        "Your message:",
        args.message,
        "",
        "You can also reach us at 800-318-7135 if you need us sooner.",
      ].join("\n"),
    });

    return { messageId, notificationSent, customerEmailSent };
  },
});

export const submitDirectMessage = action({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    platform: directMessagePlatformValidator,
    handle: v.optional(v.string()),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const directMessageId = await ctx.runMutation(api.directMessages.create, args);
    const notificationSent = await sendAdminEmail({
      subject: `New direct message from ${args.name}`,
      replyTo: args.email ?? notificationEmail,
      text: [
        `New direct message from ${args.name}`,
        `Platform: ${args.platform}`,
        `Handle: ${args.handle ?? "Not provided"}`,
        `Email: ${args.email ?? "Not provided"}`,
        `Phone: ${args.phone ?? "Not provided"}`,
        "",
        "Message:",
        args.message,
      ].join("\n"),
    });

    const customerEmailSent = args.email
      ? await sendCustomerEmail(args.email, {
          subject: "We received your message",
          text: [
            `Hi ${args.name},`,
            "",
            "Thanks for contacting Mame's Meat Pies. We received your message and will follow up soon.",
            "",
            "Your message:",
            args.message,
            "",
            "You can also reach us at 800-318-7135 if you need us sooner.",
          ].join("\n"),
        })
      : false;

    return { directMessageId, notificationSent, customerEmailSent };
  },
});

export const submitNewsletterSignup = action({
  args: {
    name: v.optional(v.string()),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const name = args.name?.trim();
    const result = await ctx.runMutation(api.newsletterSubscribers.subscribe, {
      ...(name ? { name } : {}),
      email: args.email,
      source: "contact-section",
    });

    const notificationSent = result.alreadySubscribed
      ? false
      : await sendAdminEmail({
          subject: "New Mame's email list signup",
          replyTo: args.email,
          text: [`New email list signup`, `Name: ${name || "Not provided"}`, `Email: ${args.email}`].join("\n"),
        });

    const customerEmailSent = result.alreadySubscribed
      ? false
      : await sendCustomerEmail(args.email, {
          subject: "Thanks for joining the Mame's Meat Pies email list",
          text: [
            `Hi ${name || "there"},`,
            "",
            "Thanks for signing up for updates from Mame's Meat Pies.",
            "We'll send you news, specials, and product updates from time to time.",
          ].join("\n"),
        });

    return { ...result, notificationSent, customerEmailSent };
  },
});

export const submitOrder = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    items: v.array(orderItemValidator),
    subtotal: v.optional(v.number()),
    promoCode: v.optional(v.string()),
    promoDiscount: v.optional(v.number()),
    total: v.number(),
  },
  handler: async (ctx, args) => {
    const orderId = await ctx.runMutation(api.orders.create, {
      ...args,
      paymentMethod: "email",
      status: "submitted",
    });

    const orderLines = args.items
      .map(
        (item) =>
          `${item.name} x${item.quantity} - ${formatCurrency(item.lineTotal)} (${formatCurrency(
            item.unitPrice
          )} each)`
      )
      .join("\n");

    const notificationSent = await sendAdminEmail({
      subject: `New Mame's Meat Pie order from ${args.name}`,
      replyTo: args.email,
      text: [
        `New order from ${args.name}`,
        `Email: ${args.email}`,
        `Phone: ${args.phone}`,
        "",
        "Items:",
        orderLines,
        "",
        ...(args.promoCode
          ? [
              `Subtotal: ${formatCurrency(args.subtotal ?? args.total + (args.promoDiscount ?? 0))}`,
              `Promo: ${args.promoCode} (-${formatCurrency(args.promoDiscount ?? 0)})`,
              "",
            ]
          : []),
        `Total: ${formatCurrency(args.total)}`,
        "",
        `Notes: ${args.notes ?? "None"}`,
      ].join("\n"),
    });

    const customerEmailSent = await sendCustomerEmail(args.email, {
      subject: "We received your order",
      text: [
        `Hi ${args.name},`,
        "",
        "Thanks for your order with Mame's Meat Pies. We received it and will follow up soon with next steps.",
        "",
        "Order summary:",
        orderLines,
        "",
        ...(args.promoCode
          ? [
              `Subtotal: ${formatCurrency(args.subtotal ?? args.total + (args.promoDiscount ?? 0))}`,
              `Promo: ${args.promoCode} (-${formatCurrency(args.promoDiscount ?? 0)})`,
              "",
            ]
          : []),
        `Total: ${formatCurrency(args.total)}`,
        "",
        `Notes: ${args.notes ?? "None"}`,
        "",
        "If you need to reach us right away, call 800-318-7135.",
      ].join("\n"),
    });

    return { orderId, notificationSent, customerEmailSent };
  },
});
