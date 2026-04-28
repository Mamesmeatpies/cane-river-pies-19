import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const notificationEmail = process.env.RESEND_TO_EMAIL ?? "mamesmeatpies@gmail.com";
const publicSiteUrl = (process.env.PUBLIC_SITE_URL ?? "https://www.mamescanerivermeatpies.com").replace(/\/$/, "");
const mamePortraitUrl = `${publicSiteUrl}/mame-portrait-2026.jpg`;

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

const wrapEmailHtml = (content: string) =>
  `<div style="background:#f7f1e8;padding:24px;font-family:Arial,sans-serif;line-height:1.6;color:#2a211c">
    <div style="max-width:640px;margin:0 auto;background:#fffaf3;border:1px solid #eadbc8;border-radius:20px;overflow:hidden">
      ${content}
    </div>
  </div>`;

const sendResendEmail = async ({
  to,
  subject,
  text,
  replyTo,
  html,
}: {
  to: string[];
  subject: string;
  text: string;
  replyTo: string;
  html?: string;
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
      html: html ?? `<div style="font-family:Arial,sans-serif;line-height:1.5">${textToHtml(text)}</div>`,
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
        "Thank you for your order with Mame's Meat Pies.",
        "We will contact you regarding pick up or delivery.",
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
      html: wrapEmailHtml(`
        <div style="padding:32px 32px 12px;text-align:center;background-color:#6f4635;background:#6f4635;background-image:linear-gradient(180deg,#4a2d23 0%,#6f4635 100%);color:#fffaf3">
          <img
            src="${mamePortraitUrl}"
            alt="Mame, whose family recipe inspires every Cane River Meat Pie"
            style="display:block;margin:0 auto;width:132px;height:132px;object-fit:cover;border-radius:999px;border:4px solid rgba(245,223,167,0.55);box-shadow:0 10px 30px rgba(0,0,0,0.18)"
          />
          <div style="margin-top:16px;font-size:14px;letter-spacing:0.18em;text-transform:uppercase;color:#f1d18a">Mame's Legacy</div>
          <h1 style="margin:10px 0 8px;font-size:30px;line-height:1.2;font-family:Georgia,serif;color:#fffaf3">We received your order</h1>
          <p style="margin:0 auto 12px;max-width:460px;font-size:16px;line-height:1.6;color:#f7ead7">
            From Mame's kitchen recipe to your table.
          </p>
        </div>
        <div style="padding:28px 32px 32px">
          <p style="margin:0 0 16px;font-size:16px">Hi ${escapeHtml(args.name)},</p>
          <p style="margin:0 0 14px;font-size:16px">
            Thank you for your order with Mame's Meat Pies.
          </p>
          <div style="margin:20px 0;padding:18px 20px;border-radius:16px;background:#f7f1e8;border:1px solid #eadbc8">
            <p style="margin:0 0 10px;font-size:17px;font-family:Georgia,serif;color:#6f4635">A note from Mame's table</p>
            <p style="margin:0;font-size:16px;color:#3a2d26">
              Thank you, and we will contact you regarding pick up or delivery.
            </p>
          </div>
          <div style="margin-top:22px;padding:20px;border-radius:16px;background:#fff;border:1px solid #eadbc8">
            <p style="margin:0 0 12px;font-size:17px;font-family:Georgia,serif;color:#2a211c">Order summary</p>
            <p style="margin:0;font-size:15px;white-space:pre-line;color:#4b3a31">${textToHtml(orderLines)}</p>
            ${
              args.promoCode
                ? `<p style="margin:14px 0 0;font-size:15px;color:#4b3a31">
                    Subtotal: ${escapeHtml(formatCurrency(args.subtotal ?? args.total + (args.promoDiscount ?? 0)))}<br />
                    Promo: ${escapeHtml(args.promoCode)} (-${escapeHtml(formatCurrency(args.promoDiscount ?? 0))})
                  </p>`
                : ""
            }
            <p style="margin:14px 0 0;font-size:16px;font-weight:700;color:#2a211c">Total: ${escapeHtml(formatCurrency(args.total))}</p>
            <p style="margin:10px 0 0;font-size:15px;color:#4b3a31">Notes: ${escapeHtml(args.notes ?? "None")}</p>
          </div>
          <p style="margin:22px 0 0;font-size:15px;color:#4b3a31">
            If you need to reach us right away, call <a href="tel:8003187135" style="color:#9f3b27;text-decoration:none">800-318-7135</a>.
          </p>
        </div>
      `),
    });

    return { orderId, notificationSent, customerEmailSent };
  },
});
