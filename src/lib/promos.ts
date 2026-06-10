import { MINI_PRODUCT_IDS } from "@/lib/productRules";

export type PromoCode = {
  code: string;
  label: string;
  type: "percent" | "amount" | "amount_per_quantity";
  value: number;
  excludedProductIds?: string[];
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  channelHint?: string;
};

export type AppliedPromo = {
  code: string;
  label: string;
  discountAmount: number;
};

type PromoCartItem = {
  id: string;
  priceNum: number;
  quantity: number;
};

export const PROMO_CODES: PromoCode[] = [
  {
    code: "COMP",
    label: "Complimentary order",
    type: "percent",
    value: 100,
  },
  {
    code: "MAMES10",
    label: "10% off",
    type: "percent",
    value: 10,
  },
  {
    code: "LOCALPICKUP",
    label: "$5 off",
    type: "amount",
    value: 5,
  },
  {
    code: "KIM",
    label: "$5 off per dozen",
    type: "amount_per_quantity",
    value: 5,
    channelHint: "Direct outreach",
  },
  {
    code: "WHOLESALE",
    label: "$10 off except mini meat pies",
    type: "amount",
    value: 10,
    excludedProductIds: [...MINI_PRODUCT_IDS],
    channelHint: "Wholesale",
  },
];

export const normalizePromoCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

const getEligibleSubtotal = (subtotal: number, items: PromoCartItem[] | undefined, promo: PromoCode) => {
  if (!promo.excludedProductIds || promo.excludedProductIds.length === 0 || !items) {
    return subtotal;
  }

  return items.reduce((sum, item) => {
    if (promo.excludedProductIds?.includes(item.id)) {
      return sum;
    }

    return sum + item.priceNum * item.quantity;
  }, 0);
};

export const getAppliedPromo = (code: string, subtotal: number, items?: PromoCartItem[]): AppliedPromo | null => {
  const normalizedCode = normalizePromoCode(code);
  const promo = PROMO_CODES.find((candidate) => candidate.code === normalizedCode);

  if (!promo || subtotal <= 0) {
    return null;
  }

  const eligibleSubtotal = getEligibleSubtotal(subtotal, items, promo);

  if (eligibleSubtotal <= 0) {
    return null;
  }

  const eligibleQuantity = items
    ? items.reduce((sum, item) => {
        if (promo.excludedProductIds?.includes(item.id)) {
          return sum;
        }

        return sum + item.quantity;
      }, 0)
    : 0;

  const discountAmount =
    promo.type === "percent"
      ? roundCurrency(eligibleSubtotal * (promo.value / 100))
      : promo.type === "amount_per_quantity"
        ? promo.value * eligibleQuantity
        : promo.value;

  return {
    code: promo.code,
    label: promo.label,
    discountAmount: Math.min(eligibleSubtotal, discountAmount),
  };
};
