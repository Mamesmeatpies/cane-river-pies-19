import heroImg from "@/assets/hero-meat-pies.png";

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

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 text-center pt-20">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-gold/20 border border-gold/40 rounded-full px-5 py-2 mb-8 animate-fade-in-up">
          <span className="w-2 h-2 bg-gold rounded-full" />
          <span className="text-gold text-sm font-medium tracking-wide uppercase">
            🏆 3-Time Natchitoches Meat Pie Festival Champion
          </span>
        </div>

        <h1 className="font-serif text-4xl sm:text-5xl md:text-7xl font-bold text-cream leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: "0.15s" }}>
          Handcrafted Meat Pies.
          <br />
          No Fillers.{" "}
          <span className="text-gold">Bold Southern Flavor.</span>
        </h1>

        <p className="text-cream/80 text-lg md:text-xl max-w-2xl mx-auto mb-10 animate-fade-in-up font-sans" style={{ animationDelay: "0.3s" }}>
          From Mame's kitchen recipe to your table.
        </p>

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
