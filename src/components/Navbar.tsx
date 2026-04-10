import { useState } from "react";
import { Menu, X, ShoppingCart } from "lucide-react";
import { useCart } from "@/context/CartContext";

const navLinks = [
  { label: "Home", href: "#hero" },
  { label: "Shop", href: "#shop" },
  { label: "About", href: "#about" },
  { label: "Testimonials", href: "#testimonials" },
  { label: "Locations", href: "#locations" },
  { label: "Contact", href: "#contact" },
];

const Navbar = () => {
  const [open, setOpen] = useState(false);
  const { totalItems, setIsOpen } = useCart();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-gold/20 bg-charcoal/95 backdrop-blur-md">
      <div className="container mx-auto flex items-center justify-between px-4 py-3 md:py-4">
        <a
          href="#hero"
          className="max-w-[12.5rem] font-serif text-base font-bold leading-tight tracking-wide text-cream sm:max-w-none sm:text-lg md:text-2xl"
        >
          <span className="block sm:inline">Mame's </span>
          <span className="text-gold">Cane River Meat Pies</span>
        </a>

        {/* Desktop */}
        <ul className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                href={link.href}
                className="text-cream/80 hover:text-gold transition-colors text-sm font-medium uppercase tracking-wider"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="hidden md:flex items-center gap-4">
          <button
            onClick={() => setIsOpen(true)}
            className="relative text-cream hover:text-gold transition-colors"
            aria-label="Open cart"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-cajun text-cream text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          <a
            href="#shop"
            className="bg-cajun hover:bg-cajun-light text-cream px-6 py-2.5 rounded-full text-sm font-semibold transition-all hover:shadow-lg"
          >
            Order Now
          </a>
        </div>

        {/* Mobile toggle */}
        <div className="flex items-center gap-3 md:hidden">
          <button
            onClick={() => setIsOpen(true)}
            className="relative rounded-full p-2 text-cream transition-colors hover:text-gold"
            aria-label="Open cart"
          >
            <ShoppingCart size={22} />
            {totalItems > 0 && (
              <span className="absolute -top-2 -right-2 bg-cajun text-cream text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
            )}
          </button>
          <button
            onClick={() => setOpen(!open)}
            className="rounded-full p-2 text-cream"
            aria-label="Toggle menu"
          >
            {open ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-gold/20 bg-charcoal pb-6 md:hidden">
          <ul className="flex flex-col gap-2 px-4 pt-4">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  href={link.href}
                  onClick={() => setOpen(false)}
                  className="block rounded-2xl border border-transparent bg-charcoal-light/40 px-4 py-3 text-center text-sm font-medium uppercase tracking-wider text-cream/80 transition-colors hover:border-gold/20 hover:text-gold"
                >
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <a
                href="#shop"
                onClick={() => setOpen(false)}
                className="mt-2 block rounded-full bg-cajun px-8 py-3 text-center text-sm font-semibold text-cream transition-all hover:bg-cajun-light"
              >
                Order Now
              </a>
            </li>
          </ul>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
