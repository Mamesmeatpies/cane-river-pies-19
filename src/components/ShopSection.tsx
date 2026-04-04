import { useState } from "react";
import { Minus, Plus, ShoppingCart } from "lucide-react";
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
}

const products: Product[] = [
  {
    id: "beef-pork",
    name: "Beef & Pork Meat Pie",
    description: "Our classic Cane River recipe with premium seasoned beef and pork in a golden, flaky crust.",
    image: beefPorkImg,
    category: "Full Size",
    price: "$35 / dozen",
  },
  {
    id: "spicy",
    name: "Beef & Pork Spicy",
    description: "The classic turned up with Cajun heat — bold spices wrapped in golden pastry perfection.",
    image: spicyImg,
    category: "Full Size",
    price: "$35 / dozen",
  },
  {
    id: "turkey",
    name: "Turkey Meat Pie",
    description: "A lighter twist on tradition — seasoned turkey in a handcrafted flaky crust.",
    image: turkeyImg,
    category: "Full Size",
    price: "$35 / dozen",
  },
  {
    id: "mini",
    name: "Mini Beef & Pork Pies",
    description: "Bite-sized perfection — sold in packs of 12. Ideal for parties, events, and snacking.",
    image: miniImg,
    category: "Mini · Pack of 12",
    price: "$20 / dozen",
  },
];

const ProductCard = ({ product }: { product: Product }) => {
  const [qty, setQty] = useState(1);

  return (
    <div className="group bg-card rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 border border-border">
      <div className="relative overflow-hidden aspect-square">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          width={800}
          height={800}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <span className="absolute top-4 left-4 bg-charcoal/80 text-gold text-xs font-semibold uppercase tracking-wider px-3 py-1.5 rounded-full">
          {product.category}
        </span>
      </div>
      <div className="p-6">
        <h3 className="font-serif text-xl font-bold text-foreground mb-2">{product.name}</h3>
        <p className="text-muted-foreground text-sm mb-4 leading-relaxed">{product.description}</p>
        <p className="text-cajun font-bold text-2xl mb-4">{product.price}</p>

        <div className="flex items-center gap-4">
          <div className="flex items-center border border-border rounded-full">
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
          <button className="flex-1 flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-3 rounded-full font-semibold transition-all hover:shadow-lg text-sm">
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
    <section id="shop" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Our Products</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            Taste the Tradition
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Each meat pie is handcrafted using Mame's original Cane River recipe — premium ingredients, bold seasoning, and a golden flaky crust.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopSection;
