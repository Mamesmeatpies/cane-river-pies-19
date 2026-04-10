import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { toast } from "sonner";
// @ts-ignore
import beefPorkImg from "@/assets/product-beef-pork.jpg?v=2";
// @ts-ignore
import spicyImg from "@/assets/product-spicy.png";
import turkeyImg from "@/assets/product-turkey.png";
import miniImg from "@/assets/mini-pies-tray.png";

interface Product {
  id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  price: string;
  priceNum: number;
}

const products: Product[] = [
  {
    id: "beef-pork",
    name: "Beef & Pork Meat Pie",
    description: "Our classic Cane River recipe with premium seasoned beef and pork in a golden, flaky crust.",
    image: beefPorkImg,
    category: "Full Size",
    price: "$35 / dozen",
    priceNum: 35,
  },
  {
    id: "spicy",
    name: "Beef & Pork Spicy",
    description: "The classic turned up with Cajun heat — bold spices wrapped in golden pastry perfection.",
    image: spicyImg,
    category: "Full Size",
    price: "$35 / dozen",
    priceNum: 35,
  },
  {
    id: "turkey",
    name: "Turkey Meat Pie",
    description: "A lighter twist on tradition — seasoned turkey in a handcrafted flaky crust.",
    image: turkeyImg,
    category: "Full Size",
    price: "$35 / dozen",
    priceNum: 35,
  },
  {
    id: "mini",
    name: "Mini Beef & Pork Pies",
    description: "Bite-sized perfection — sold in packs of 12. Ideal for parties, events, and snacking.",
    image: miniImg,
    category: "Mini · Pack of 12",
    price: "$20 / dozen",
    priceNum: 20,
  },
];

const ProductCard = ({ product }: { product: Product }) => {
  const [qty, setQty] = useState(1);
  const { addItem } = useCart();

  const handleAdd = () => {
    addItem(
      { id: product.id, name: product.name, price: product.price, priceNum: product.priceNum, image: product.image },
      qty
    );
    toast.success(`${qty}x ${product.name} added to cart`);
    setQty(1);
  };

  return (
    <div className="group overflow-hidden rounded-2xl border border-border bg-card shadow-md transition-all duration-300 hover:shadow-xl">
      <div className="relative overflow-hidden aspect-square">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={800}
          height={800}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute left-3 top-3 rounded-full bg-charcoal/80 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gold sm:left-4 sm:top-4 sm:text-xs">
          {product.category}
        </span>
      </div>
      <div className="p-5 sm:p-6">
        <h3 className="mb-2 font-serif text-lg font-bold text-foreground sm:text-xl">{product.name}</h3>
        <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{product.description}</p>
        <p className="mb-4 text-2xl font-bold text-cajun">{product.price}</p>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex items-center justify-center rounded-full border border-border sm:justify-start">
            <button
              onClick={() => setQty(Math.max(1, qty - 1))}
              className="p-2 hover:bg-muted rounded-l-full transition-colors"
              aria-label="Decrease quantity"
            >
              <Minus size={16} />
            </button>
            <span className="w-10 text-center font-semibold text-sm">{qty}</span>
            <button
              onClick={() => setQty(qty + 1)}
              className="p-2 hover:bg-muted rounded-r-full transition-colors"
              aria-label="Increase quantity"
            >
              <Plus size={16} />
            </button>
          </div>
          <button
            onClick={handleAdd}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-cajun py-3 text-sm font-semibold text-primary-foreground transition-all hover:bg-cajun-light hover:shadow-lg sm:flex-1"
          >
            <ShoppingCart size={16} />
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

const ShopSection = () => {
  return (
    <section id="shop" className="bg-cream-dark py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center md:mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Our Products</span>
          <h2 className="mt-3 mb-4 font-serif text-3xl font-bold text-foreground md:text-5xl">
            Taste the Tradition
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Each meat pie is handcrafted using Mame's original Cane River recipe — premium ingredients, bold seasoning, and a golden flaky crust.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopSection;
