import { describe, expect, it } from "vitest";
import { getAppliedPromo, normalizePromoCode } from "@/lib/promos";

describe("promos", () => {
  it("normalizes promo codes before lookup", () => {
    expect(normalizePromoCode(" comp ")).toBe("COMP");
  });

  it("applies the complimentary promo as a full discount", () => {
    expect(getAppliedPromo("COMP", 48)).toEqual({
      code: "COMP",
      label: "Complimentary order",
      discountAmount: 48,
    });
  });

  it("caps amount-based discounts at the subtotal", () => {
    expect(getAppliedPromo("LOCALPICKUP", 3)).toEqual({
      code: "LOCALPICKUP",
      label: "$5 off",
      discountAmount: 3,
    });
  });

  it("applies the kim promo as a $5 discount", () => {
    expect(getAppliedPromo("kim", 42)).toEqual({
      code: "KIM",
      label: "$5 off",
      discountAmount: 5,
    });
  });

  it("excludes mini pies from the wholesale discount", () => {
    expect(
      getAppliedPromo("WHOLESALE", 45, [
        { id: "mini", priceNum: 15, quantity: 2 },
        { id: "beef-pork", priceNum: 15, quantity: 1 },
      ])
    ).toEqual({
      code: "WHOLESALE",
      label: "$10 off except mini meat pies",
      discountAmount: 10,
    });
  });

  it("does not apply wholesale when only excluded mini pies are in the cart", () => {
    expect(
      getAppliedPromo("WHOLESALE", 30, [
        { id: "mini", priceNum: 15, quantity: 2 },
      ])
    ).toBeNull();
  });
});
