export interface StripePaymentLinkItem {
  id: string;
  quantity: number;
}

const stripePaymentLinkUrl = import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL?.trim() ?? "";

export const hasStripePaymentLink = () => stripePaymentLinkUrl.length > 0;

const sanitizeReferencePart = (value: string) =>
  value.replace(/[^a-zA-Z0-9_-]/g, "-").replace(/-+/g, "-").slice(0, 60);

export const buildClientReferenceId = (items: StripePaymentLinkItem[]) => {
  const cartRef = items
    .map((item) => `${sanitizeReferencePart(item.id)}_${item.quantity}`)
    .join("-");

  return `cart_${cartRef}_${Date.now()}`.slice(0, 200);
};

export const buildStripePaymentLink = ({
  email,
  items,
  paymentLinkUrl = stripePaymentLinkUrl,
}: {
  email?: string;
  items: StripePaymentLinkItem[];
  paymentLinkUrl?: string;
}) => {
  if (!paymentLinkUrl) return "";

  const url = new URL(paymentLinkUrl);
  url.searchParams.set("client_reference_id", buildClientReferenceId(items));

  const cleanEmail = email?.trim();
  if (cleanEmail) {
    url.searchParams.set("prefilled_email", cleanEmail);
  }

  return url.toString();
};
