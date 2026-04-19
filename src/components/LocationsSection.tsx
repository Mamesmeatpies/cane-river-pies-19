import { MapPin } from "lucide-react";

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
    <section id="locations" className="bg-cream-dark py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center md:mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Find Us</span>
          <h2 className="mt-3 mb-4 font-serif text-3xl font-bold text-foreground md:text-5xl">
            Where to Find Us
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Pick up Mame's Cane River Meat Pies at these locations or order online.
          </p>
        </div>

        <div className="mx-auto mb-10 grid max-w-3xl gap-6 md:mb-12 md:grid-cols-2 md:gap-8">
          {locations.map((loc) => (
            <div
              key={loc.name}
              className="rounded-2xl border border-border bg-card p-6 text-center shadow-md transition-all duration-300 hover:shadow-xl sm:p-8"
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
                className="inline-flex items-center gap-2 rounded-full border-2 border-cajun px-6 py-2.5 text-sm font-semibold text-cajun transition-all hover:bg-cajun hover:text-cream"
              >
                Visit Location
              </a>
            </div>
          ))}
        </div>

        {/* Featured partner */}
        <div className="mx-auto max-w-2xl rounded-2xl bg-charcoal p-6 text-center shadow-xl sm:p-8 md:p-12">
          <span className="text-gold text-sm font-semibold uppercase tracking-widest">Featured Partner</span>
          <h3 className="font-serif text-2xl md:text-3xl font-bold text-cream mt-3 mb-4">
            Ratcliff Premium Meats
          </h3>
          <p className="mx-auto mb-8 max-w-md text-sm text-cream/70 sm:text-base">
            Find our pies at the Ratcliff Premium Meats booth inside Frisco Fresh Market.
          </p>
          <a
            href="#contact"
            className="inline-flex items-center gap-2 rounded-full bg-gold px-6 py-3 text-center font-semibold text-charcoal transition-all hover:bg-gold-light hover:shadow-lg sm:px-8"
          >
            Ask About Pickup
          </a>
        </div>
      </div>
    </section>
  );
};

export default LocationsSection;
