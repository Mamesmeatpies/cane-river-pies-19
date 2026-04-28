import { createContext, useContext, useState, ReactNode } from "react";
import { AppliedPromo, getAppliedPromo, normalizePromoCode } from "@/lib/promos";
import { getEffectiveUnitPrice, getMinimumQuantity } from "@/lib/productRules";

export interface CartItem {
  id: string;
  name: string;
  price: string;
  priceNum: number;
  quantity: number;
  image: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "quantity">, qty: number) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, qty: number) => void;
  clearCart: () => void;
  totalItems: number;
  cartSubtotal: number;
  promoCode: string;
  appliedPromo: AppliedPromo | null;
  promoDiscount: number;
  totalPrice: number;
  applyPromoCode: (code: string) => boolean;
  removePromoCode: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");

  const addItem = (item: Omit<CartItem, "quantity">, qty: number) => {
    setItems((prev) => {
      const minimumQuantity = getMinimumQuantity(item.id);
      const nextQuantity = Math.max(minimumQuantity, qty);
      const normalizedItem = {
        ...item,
        priceNum: getEffectiveUnitPrice(item.id, item.priceNum),
      };
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? {
                ...i,
                priceNum: normalizedItem.priceNum,
                price: normalizedItem.price,
                quantity: i.quantity + nextQuantity,
              }
            : i
        );
      }
      return [...prev, { ...normalizedItem, quantity: nextQuantity }];
    });
    setIsOpen(true);
  };

  const removeItem = (id: string) =>
    setItems((prev) => prev.filter((i) => i.id !== id));

  const updateQuantity = (id: string, qty: number) => {
    const minimumQuantity = getMinimumQuantity(id);
    if (qty < 1) return removeItem(id);
    setItems((prev) =>
      prev.map((i) =>
        i.id === id
          ? {
              ...i,
              priceNum: getEffectiveUnitPrice(i.id, i.priceNum),
              quantity: Math.max(minimumQuantity, qty),
            }
          : i
      )
    );
  };

  const clearCart = () => {
    setItems([]);
    setPromoCode("");
  };

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const cartSubtotal = items.reduce((sum, i) => sum + i.priceNum * i.quantity, 0);
  const appliedPromo = promoCode ? getAppliedPromo(promoCode, cartSubtotal) : null;
  const promoDiscount = appliedPromo?.discountAmount ?? 0;
  const totalPrice = Math.max(0, cartSubtotal - promoDiscount);

  const applyPromoCode = (code: string) => {
    const normalizedCode = normalizePromoCode(code);
    const promo = getAppliedPromo(normalizedCode, cartSubtotal);

    if (!promo) {
      return false;
    }

    setPromoCode(normalizedCode);
    return true;
  };

  const removePromoCode = () => setPromoCode("");

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        cartSubtotal,
        promoCode,
        appliedPromo,
        promoDiscount,
        totalPrice,
        applyPromoCode,
        removePromoCode,
        isOpen,
        setIsOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
