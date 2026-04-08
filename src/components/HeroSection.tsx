import heroImg from "@/assets/hero-meat-pies.png";
import mamePortrait from "@/assets/mame-portrait-2026.jpg";

const HeroSection = () => {
  return (
    <section id="hero" className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0">
        <img
          src={heroImg}
          alt="Golden crispy Louisiana meat pies fresh from the kitchen"
          className="w-full h-full object-cover"
          width={1920}
          height={1080}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/70 to-charcoal/30" />
      </div>

      <div className="absolute right-4 top-24 z-10 w-24 sm:w-32 md:w-40 lg:right-10 lg:top-28 lg:w-44">
        <div className="rounded-[1.75rem] border border-cream/20 bg-charcoal/35 p-2 shadow-2xl backdrop-blur-sm">
          <div className="overflow-hidden rounded-[1.25rem]">
            <img
              src={mamePortrait}
              alt="Mame, whose family recipe inspires every Cane River Meat Pie"
              className="h-full w-full object-cover"
              width={595}
              height={842}
            />
          </div>
          <div className="px-3 pb-2 pt-3 text-center">
            <p className="font-serif text-sm text-cream sm:text-base">Mame's Legacy</p>
            <p className="text-[11px] uppercase tracking-[0.24em] text-gold/90 sm:text-xs">
              The heart behind every meatpie
            </p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 pb-20 pt-20 text-center md:pb-24">
        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-cream leading-tight mb-2 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          Hand Crafted Meat Pies,
          <br />
          <span className="text-gold">Bold Southern Flavor.</span>
        </h1>
        <p className="font-serif text-xl sm:text-2xl md:text-3xl text-cream/90 mb-6 animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
          No Fillers.
        </p>

        <p className="text-cream/80 text-lg md:text-xl max-w-2xl mx-auto mb-6 animate-fade-in-up font-sans" style={{ animationDelay: "0.3s" }}>
          From Mame's kitchen recipe to your table.
        </p>

        {/* Champion Badge */}
        <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/40 rounded-full px-5 py-2 mb-10 animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
          <span className="text-gold text-sm font-medium tracking-wide uppercase">
            🏆 3-Time Natchitoches Meat Pie Festival Champion
          </span>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.5s" }}>
          <a
            href="#shop"
            className="bg-cajun hover:bg-cajun-light text-cream px-10 py-4 rounded-full text-lg font-semibold transition-all hover:shadow-2xl hover:shadow-cajun/30 hover:-translate-y-0.5"
          >
            Buy Now
          </a>
          <a
            href="#locations"
            className="border-2 border-gold/60 text-gold hover:bg-gold/10 px-10 py-4 rounded-full text-lg font-semibold transition-all hover:-translate-y-0.5"
          >
            Where to Find Us
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
        <div className="w-6 h-10 border-2 border-cream/40 rounded-full flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 bg-gold rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
