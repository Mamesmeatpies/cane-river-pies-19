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
  subject,
  text,
  replyTo,
}: {
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
      to: [notificationEmail],
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

    await sendResendEmail({
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

    return { messageId };
  },
});

export const submitOrder = action({
  args: {
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    notes: v.optional(v.string()),
    items: v.array(orderItemValidator),
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

    await sendResendEmail({
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
        `Total: ${formatCurrency(args.total)}`,
        "",
        `Notes: ${args.notes ?? "None"}`,
      ].join("\n"),
    });

    return { orderId };
  },
});
