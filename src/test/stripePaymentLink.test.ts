import { describe, expect, it, vi } from "vitest";
import { buildStripePaymentLink } from "@/lib/stripePaymentLink";

describe("buildStripePaymentLink", () => {
  it("adds Stripe Payment Link tracking parameters", () => {
    vi.setSystemTime(new Date("2026-04-09T12:00:00Z"));

    const url = buildStripePaymentLink({
      email: "customer@example.com",
      items: [
        { id: "beef-pork", quantity: 2 },
        { id: "mini", quantity: 1 },
      ],
      paymentLinkUrl: "https://buy.stripe.com/test_123?utm_source=site",
    });

    const parsedUrl = new URL(url);

    expect(parsedUrl.origin).toBe("https://buy.stripe.com");
    expect(parsedUrl.searchParams.get("utm_source")).toBe("site");
    expect(parsedUrl.searchParams.get("prefilled_email")).toBe("customer@example.com");
    expect(parsedUrl.searchParams.get("client_reference_id")).toMatch(/^cart_beef-pork_2-mini_1_/);
  });
});
