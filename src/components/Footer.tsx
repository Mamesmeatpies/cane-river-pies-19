import { Instagram, Facebook } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-charcoal pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 mb-12">
          {/* Brand */}
          <div>
            <h3 className="font-serif text-2xl font-bold text-cream mb-4">
              Mame's <span className="text-gold">Cane River Meat Pies</span>
            </h3>
            <p className="text-cream/60 text-sm leading-relaxed">
              Authentic Cane River Louisiana meat pies, handcrafted in Houston, Texas. 
              A family recipe bringing Southern comfort to your table.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-cream font-semibold uppercase tracking-wider text-sm mb-4">Quick Links</h4>
            <ul className="space-y-3">
              {["Shop", "About", "Testimonials", "Locations", "Contact"].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    className="text-cream/60 hover:text-gold transition-colors text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-cream font-semibold uppercase tracking-wider text-sm mb-4">Contact</h4>
            <ul className="space-y-3 text-cream/60 text-sm">
              <li>
                <a href="tel:8003187135" className="hover:text-gold transition-colors">800-318-7135</a>
              </li>
              <li>
                <a href="mailto:mamesmeatpies@gmail.com" className="hover:text-gold transition-colors">
                  mamesmeatpies@gmail.com
                </a>
              </li>
              <li>Houston, Texas</li>
            </ul>
            <div className="flex gap-4 mt-6">
              <a
                href="https://www.instagram.com/mamesmeatpies/"
                aria-label="Instagram"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-cream/20 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold transition-all"
              >
                <Instagram size={18} />
              </a>
              <a
                href="https://www.facebook.com/mamescanerivermeatpies"
                aria-label="Facebook"
                target="_blank"
                rel="noreferrer"
                className="w-10 h-10 rounded-full border border-cream/20 flex items-center justify-center text-cream/60 hover:text-gold hover:border-gold transition-all"
              >
                <Facebook size={18} />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-cream/10 pt-8 text-center">
          <p className="text-cream/40 text-sm">
            © {new Date().getFullYear()} Mame's Cane River Meat Pies. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
