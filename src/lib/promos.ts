export type PromoCode = {
  code: string;
  label: string;
  type: "percent" | "amount";
  value: number;
};

export type AppliedPromo = {
  code: string;
  label: string;
  discountAmount: number;
};

export const PROMO_CODES: PromoCode[] = [
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
];

export const normalizePromoCode = (code: string) => code.trim().toUpperCase().replace(/\s+/g, "");

const roundCurrency = (value: number) => Math.round(value * 100) / 100;

export const getAppliedPromo = (code: string, subtotal: number): AppliedPromo | null => {
  const normalizedCode = normalizePromoCode(code);
  const promo = PROMO_CODES.find((candidate) => candidate.code === normalizedCode);

  if (!promo || subtotal <= 0) {
    return null;
  }

  const discountAmount =
    promo.type === "percent" ? roundCurrency(subtotal * (promo.value / 100)) : promo.value;

  return {
    code: promo.code,
    label: promo.label,
    discountAmount: Math.min(subtotal, discountAmount),
  };
};
