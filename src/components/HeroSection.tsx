import heroImg from "@/assets/hero-meat-pies.png";
import mamePortrait from "@/assets/mame-portrait-2026.jpg";

const HeroSection = () => {
  return (
    <section id="hero" className="relative flex min-h-screen items-center justify-center overflow-hidden">
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

      <div className="absolute right-4 top-24 z-10 hidden w-24 sm:w-32 md:block md:w-36 lg:right-10 lg:top-28 lg:w-44">
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
      <div className="relative z-10 container mx-auto px-4 pb-16 pt-28 text-center sm:pb-20 md:pb-24 md:pt-20">
        <div className="mx-auto mb-6 flex w-fit max-w-[11rem] flex-col rounded-[1.5rem] border border-cream/20 bg-charcoal/45 p-2 shadow-xl backdrop-blur-sm md:hidden">
          <div className="overflow-hidden rounded-[1.1rem]">
            <img
              src={mamePortrait}
              alt="Mame, whose family recipe inspires every Cane River Meat Pie"
              className="h-full w-full object-cover"
              width={595}
              height={842}
            />
          </div>
          <div className="px-2 pb-1 pt-2 text-center">
            <p className="font-serif text-sm text-cream">Mame's Legacy</p>
            <p className="text-[10px] uppercase tracking-[0.22em] text-gold/90">
              The heart behind every meatpie
            </p>
          </div>
        </div>

        <h1 className="mb-3 animate-fade-in-up font-serif text-4xl font-bold leading-tight text-cream sm:text-5xl md:mb-2 md:text-7xl" style={{ animationDelay: "0.15s" }}>
          Hand Crafted Meat Pies,
          <br />
          <span className="text-gold">Bold Southern Flavor.</span>
        </h1>
        <p className="mb-5 animate-fade-in-up font-serif text-lg text-cream/90 sm:text-2xl md:mb-6 md:text-3xl" style={{ animationDelay: "0.2s" }}>
          No Fillers.
        </p>

        <p className="mx-auto mb-6 max-w-xl animate-fade-in-up font-sans text-base text-cream/80 sm:max-w-2xl sm:text-lg md:text-xl" style={{ animationDelay: "0.3s" }}>
          From Mame's kitchen recipe to your table.
        </p>

        {/* Champion Badge */}
        <div className="mb-8 inline-flex max-w-[19rem] items-center justify-center gap-2 rounded-full border border-gold/40 bg-gold/20 px-4 py-2 text-center animate-fade-in-up sm:mb-10 sm:max-w-none sm:px-5" style={{ animationDelay: "0.4s" }}>
          <span className="text-xs font-medium uppercase tracking-wide text-gold sm:text-sm">
            🏆 3-Time Natchitoches Meat Pie Festival Champion
          </span>
        </div>

        <div className="mx-auto flex max-w-sm flex-col gap-3 animate-fade-in-up sm:max-w-none sm:flex-row sm:justify-center sm:gap-4" style={{ animationDelay: "0.5s" }}>
          <a
            href="#shop"
            className="rounded-full bg-cajun px-8 py-4 text-base font-semibold text-cream transition-all hover:-translate-y-0.5 hover:bg-cajun-light hover:shadow-2xl hover:shadow-cajun/30 sm:px-10 sm:text-lg"
          >
            Buy Now
          </a>
          <a
            href="#locations"
            className="rounded-full border-2 border-gold/60 px-8 py-4 text-base font-semibold text-gold transition-all hover:-translate-y-0.5 hover:bg-gold/10 sm:px-10 sm:text-lg"
          >
            Where to Find Us
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce md:block">
        <div className="w-6 h-10 border-2 border-cream/40 rounded-full flex items-start justify-center pt-2">
          <div className="w-1.5 h-3 bg-gold rounded-full" />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
