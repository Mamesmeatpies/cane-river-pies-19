import { useState } from "react";
import { useAction, useMutation } from "convex/react";
import { CreditCard, Minus, Phone, Plus, ShoppingCart, Tag, Trash2, X, Send } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { buildStripePaymentLink, hasStripePaymentLink } from "@/lib/stripePaymentLink";

const STRIPE_CHECKOUT_ENABLED = false;

const CartDrawer = () => {
  const {
    items,
    removeItem,
    updateQuantity,
    clearCart,
    totalItems,
    cartSubtotal,
    appliedPromo,
    promoDiscount,
    totalPrice,
    applyPromoCode,
    removePromoCode,
    isOpen,
    setIsOpen,
  } = useCart();
  const createOrder = useMutation(api.orders.create);
  const submitOrder = useAction(api.notifications.submitOrder);
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [promoEntry, setPromoEntry] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const closeCart = () => {
    setShowCheckout(false);
    setIsOpen(false);
  };

  const backToProducts = () => {
    closeCart();
    window.setTimeout(() => {
      document.getElementById("shop")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  };

  const handleApplyPromo = () => {
    if (!promoEntry.trim()) {
      toast.error("Enter a promo code first.");
      return;
    }

    if (!applyPromoCode(promoEntry)) {
      toast.error("That promo code is not available.");
      return;
    }

    setPromoEntry("");
    toast.success("Promo code applied.");
  };

  const saveOrder = async (paymentMethod: "stripe" | "email") => {
    await createOrder({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim() || undefined,
      paymentMethod,
      status: paymentMethod === "stripe" ? "checkout_started" : "submitted",
      items: items.map((item) => ({
        productId: item.id,
        name: item.name,
        unitPrice: item.priceNum,
        quantity: item.quantity,
        lineTotal: item.priceNum * item.quantity,
      })),
      subtotal: cartSubtotal,
      promoCode: appliedPromo?.code,
      promoDiscount,
      total: totalPrice,
    });
  };

  const submitEmailOrder = async () => {
    const result = await submitOrder({
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      notes: form.notes.trim() || undefined,
      items: items.map((item) => ({
        productId: item.id,
        name: item.name,
        unitPrice: item.priceNum,
        quantity: item.quantity,
        lineTotal: item.priceNum * item.quantity,
      })),
      subtotal: cartSubtotal,
      promoCode: appliedPromo?.code,
      promoDiscount,
      total: totalPrice,
    });

    if (result.customerEmailSent) {
      toast.success("Order submitted! Check your email for your order confirmation.");
    } else if (result.notificationSent) {
      toast.success("Order submitted! We received it and will follow up soon.");
    } else {
      toast.success("Order saved! We received it, but the email confirmation did not send.");
    }

    clearCart();
    setShowCheckout(false);
    setForm({ name: "", email: "", phone: "", notes: "" });
    closeCart();
  };

  const submitStripeOrder = async () => {
    if (!STRIPE_CHECKOUT_ENABLED) {
      toast.error("Stripe checkout is currently paused. Please send your order by email.");
      return false;
    }

    const stripeUrl = buildStripePaymentLink({ email: form.email, items });

    if (!stripeUrl) {
      toast.error("Add your Stripe sandbox Payment Link URL to VITE_STRIPE_PAYMENT_LINK_URL first.");
      return false;
    }

    await saveOrder("stripe");
    toast.success("Opening secure Stripe checkout.");
    window.location.href = stripeUrl;
    return true;
  };

  const handleSubmit = async (e: React.SyntheticEvent, paymentMethod: "stripe" | "email") => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in your name, email, and phone number.");
      return;
    }
    setSubmitting(true);

    try {
      if (paymentMethod === "stripe") {
        if (!(await submitStripeOrder())) {
          setSubmitting(false);
        }
      } else {
        await submitEmailOrder();
        setSubmitting(false);
      }
    } catch {
      toast.error("Could not save your order. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={closeCart} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-cajun" />
            <h2 className="font-serif text-xl font-bold text-foreground">Your Cart ({totalItems})</h2>
          </div>
          <button
            onClick={closeCart}
            className="p-2 hover:bg-muted rounded-full transition-colors"
            aria-label="Close cart"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
              <button
                type="button"
                onClick={backToProducts}
                className="mt-5 inline-flex items-center justify-center rounded-full border border-border px-5 py-2.5 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Back to Products
              </button>
            </div>
          ) : showCheckout ? (
            <form onSubmit={(e) => handleSubmit(e, STRIPE_CHECKOUT_ENABLED ? "stripe" : "email")} className="space-y-4">
              <h3 className="font-serif text-lg font-bold text-foreground mb-2">Contact Info</h3>
              <input
                type="text"
                placeholder="Your Name *"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-cajun/50 outline-none"
                required
                maxLength={100}
              />
              <input
                type="email"
                placeholder="Email *"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-cajun/50 outline-none"
                required
                maxLength={255}
              />
              <input
                type="tel"
                placeholder="Phone *"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-cajun/50 outline-none"
                required
                maxLength={20}
              />
              <textarea
                placeholder="Special instructions (optional)"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-cajun/50 outline-none resize-none"
                maxLength={500}
              />

              <div className="border-t border-border pt-4">
                <div className="mb-4 space-y-2 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>${cartSubtotal.toFixed(2)}</span>
                  </div>
                  {appliedPromo && (
                    <div className="flex justify-between font-semibold text-emerald-700">
                      <span>Promo ({appliedPromo.code}):</span>
                      <span>-${promoDiscount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-border pt-2 font-bold text-lg">
                    <span>Total:</span>
                    <span className="text-cajun">${totalPrice.toFixed(2)}</span>
                  </div>
                </div>
                {STRIPE_CHECKOUT_ENABLED ? (
                  <>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-3.5 rounded-full font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      <CreditCard size={16} />
                      Pay with Stripe
                    </button>
                    {!hasStripePaymentLink() && (
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                        Add your sandbox Payment Link URL to VITE_STRIPE_PAYMENT_LINK_URL to turn on Stripe checkout.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={(e) => handleSubmit(e, "email")}
                      disabled={submitting}
                      className="w-full mt-2 flex items-center justify-center gap-2 border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted disabled:opacity-50"
                    >
                      <Send size={15} />
                      Send order by email
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-3.5 rounded-full font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                    >
                      <Send size={15} />
                      Send order by email
                    </button>
                    <a
                      href="tel:8003187135"
                      className="mt-2 flex w-full items-center justify-center gap-2 border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
                    >
                      <Phone size={15} />
                      Call 800-318-7135
                    </a>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                      Orders are currently handled by email or phone for Houston, TX; Natchitoches, LA; Baton Rouge,
                      LA; Little Rock, Arkansas; and surrounding areas.
                    </p>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="w-full mt-2 py-3 text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  ← Back to Cart
                </button>
                <button
                  type="button"
                  onClick={backToProducts}
                  className="w-full py-3 text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  Back to Products
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 rounded-xl bg-muted/50">
                  <img src={item.image} alt={item.name} className="w-20 h-20 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-serif font-bold text-foreground text-sm truncate">{item.name}</h4>
                    <p className="text-cajun font-semibold text-sm">{item.price}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center border border-border rounded-full">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 hover:bg-muted rounded-l-full transition-colors"
                        >
                          <Minus size={12} />
                        </button>
                        <span className="w-8 text-center text-xs font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 hover:bg-muted rounded-r-full transition-colors"
                        >
                          <Plus size={12} />
                        </button>
                      </div>
                      <button onClick={() => removeItem(item.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors">
                        <Trash2 size={14} />
                      </button>
                      <span className="ml-auto font-semibold text-sm">${(item.priceNum * item.quantity).toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="border border-border p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Tag size={15} className="text-cajun" />
                  Promo code
                </div>
                {appliedPromo ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-muted/60 px-3 py-2 text-sm">
                    <div>
                      <p className="font-semibold text-foreground">{appliedPromo.code}</p>
                      <p className="text-muted-foreground">
                        {appliedPromo.label} applied. You saved ${promoDiscount.toFixed(2)}.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={removePromoCode}
                      className="text-sm font-semibold text-cajun transition-colors hover:text-cajun-light"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={promoEntry}
                      onChange={(e) => setPromoEntry(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleApplyPromo();
                        }
                      }}
                      placeholder="Enter code"
                      className="min-w-0 flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm uppercase text-foreground placeholder:normal-case placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cajun/50"
                      maxLength={30}
                    />
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      className="rounded-lg bg-cajun px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-cajun-light"
                    >
                      Apply
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && !showCheckout && (
          <div className="p-6 border-t border-border space-y-3">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal:</span>
                <span>${cartSubtotal.toFixed(2)}</span>
              </div>
              {appliedPromo && (
                <div className="flex justify-between font-semibold text-emerald-700">
                  <span>Promo ({appliedPromo.code}):</span>
                  <span>-${promoDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 font-bold text-lg">
                <span>Total:</span>
                <span className="text-cajun">${totalPrice.toFixed(2)}</span>
              </div>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-3.5 rounded-full font-semibold transition-all hover:shadow-lg"
            >
              Order by Email or Phone
            </button>
            <button
              onClick={backToProducts}
              className="w-full flex items-center justify-center gap-2 border border-border py-3 text-sm font-semibold text-foreground transition-colors hover:bg-muted"
            >
              Back to Products
            </button>
            <button
              onClick={clearCart}
              className="w-full py-2 text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              Clear Cart
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
