import { MapPin, ExternalLink } from "lucide-react";

const locations = [
  {
    name: "Frenchy's Chicken",
    details: "Houston, TX — Multiple Locations",
    link: "https://frenchyschicken.com",
  },
  {
    name: "Frisco Fresh Market",
    details: "Ratcliff Premium Meats Booth",
    link: "https://friscofreshmarket.com",
  },
];

const LocationsSection = () => {
  return (
    <section id="locations" className="py-24 bg-cream-dark">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Find Us</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            Where to Find Us
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Pick up Mame's Cane River Meat Pies at these locations or order online.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto mb-12">
          {locations.map((loc) => (
            <div
              key={loc.name}
              className="bg-card rounded-2xl p-8 shadow-md border border-border hover:shadow-xl transition-all duration-300 text-center"
            >
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-cajun/10 mb-4">
                <MapPin className="text-cajun" size={24} />
              </div>
              <h3 className="font-serif text-xl font-bold text-foreground mb-2">{loc.name}</h3>
              <p className="text-muted-foreground text-sm mb-6">{loc.details}</p>
              <a
                href={loc.link}
                target={loc.link !== "#" ? "_blank" : undefined}
                rel={loc.link !== "#" ? "noopener noreferrer" : undefined}
                className="inline-flex items-center gap-2 border-2 border-cajun text-cajun hover:bg-cajun hover:text-cream px-6 py-2.5 rounded-full text-sm font-semibold transition-all"
              >
                Visit Location
              </a>
            </div>
          ))}
        </div>

        {/* Featured partner */}
        <div className="max-w-2xl mx-auto bg-charcoal rounded-2xl p-8 md:p-12 text-center shadow-xl">
          <span className="text-gold text-sm font-semibold uppercase tracking-widest">Featured Partner</span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-cream mt-3 mb-4">
            Ratcliff Premium Meats
          </h3>
          <p className="text-cream/70 mb-8 max-w-md mx-auto">
            Shop premium cuts and quality meats from our trusted partner.
          </p>
          <a
            href="https://www.ratcliffpremiummeats.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-gold hover:bg-gold-light text-charcoal px-8 py-3 rounded-full font-semibold transition-all hover:shadow-lg"
          >
            Buy Premium Meats from Ratcliff Premium Meats
            <ExternalLink size={16} />
          </a>
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
