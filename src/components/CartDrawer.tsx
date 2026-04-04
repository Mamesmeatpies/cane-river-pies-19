import { useState } from "react";
import { Minus, Plus, ShoppingCart, Trash2, X, Send } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";

const CartDrawer = () => {
  const { items, removeItem, updateQuantity, clearCart, totalItems, totalPrice, isOpen, setIsOpen } = useCart();
  const [showCheckout, setShowCheckout] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", phone: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim()) {
      toast.error("Please fill in your name, email, and phone number.");
      return;
    }
    setSubmitting(true);

    const orderLines = items
      .map((i) => `${i.name} x${i.quantity} — $${(i.priceNum * i.quantity).toFixed(2)}`)
      .join("\n");

    const body = `New Order from ${form.name}\nEmail: ${form.email}\nPhone: ${form.phone}\n\nItems:\n${orderLines}\n\nTotal: $${totalPrice.toFixed(2)}\n\nNotes: ${form.notes || "None"}`;

    const mailtoLink = `mailto:mamesmeatpies@gmail.com?subject=${encodeURIComponent("New Mame's Meat Pie Order")}&body=${encodeURIComponent(body)}`;
    window.open(mailtoLink, "_blank");

    toast.success("Order submitted! Check your email app to send.");
    clearCart();
    setShowCheckout(false);
    setForm({ name: "", email: "", phone: "", notes: "" });
    setSubmitting(false);
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/50 z-50" onClick={() => setIsOpen(false)} />

      {/* Drawer */}
      <div className="fixed top-0 right-0 h-full w-full max-w-md bg-background z-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <ShoppingCart size={20} className="text-cajun" />
            <h2 className="font-serif text-xl font-bold text-foreground">Your Cart ({totalItems})</h2>
          </div>
          <button onClick={() => setIsOpen(false)} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {items.length === 0 ? (
            <div className="text-center py-12">
              <ShoppingCart size={48} className="mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">Your cart is empty</p>
            </div>
          ) : showCheckout ? (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <div className="flex justify-between font-bold text-lg mb-4">
                  <span>Total:</span>
                  <span className="text-cajun">${totalPrice.toFixed(2)}</span>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-3.5 rounded-full font-semibold transition-all hover:shadow-lg disabled:opacity-50"
                >
                  <Send size={16} />
                  Send Order
                </button>
                <button
                  type="button"
                  onClick={() => setShowCheckout(false)}
                  className="w-full mt-2 py-3 text-muted-foreground hover:text-foreground text-sm transition-colors"
                >
                  ← Back to Cart
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
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && !showCheckout && (
          <div className="p-6 border-t border-border space-y-3">
            <div className="flex justify-between font-bold text-lg">
              <span>Total:</span>
              <span className="text-cajun">${totalPrice.toFixed(2)}</span>
            </div>
            <button
              onClick={() => setShowCheckout(true)}
              className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-3.5 rounded-full font-semibold transition-all hover:shadow-lg"
            >
              Proceed to Checkout
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
