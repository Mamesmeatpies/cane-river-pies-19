import mameImg from "@/assets/mame-kitchen-2.jpg";

const AboutSection = () => {
  return (
    <section id="about" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="grid items-center gap-12 md:grid-cols-2 md:gap-16">
          {/* Image */}
          <div className="relative">
            <div className="rounded-2xl overflow-hidden shadow-2xl">
              <img
                src={mameImg}
                alt="Mame with rows of handmade Cane River meat pies"
                loading="lazy"
                className="w-full h-auto object-contain"
              />
            </div>
            {/* Floating badge */}
            <div className="absolute -bottom-5 right-3 rounded-2xl bg-cajun p-4 text-center text-cream shadow-xl md:-left-6 md:right-auto md:bottom-6 md:p-6">
              <p className="font-serif text-2xl font-bold md:text-3xl">100%</p>
              <p className="text-xs text-cream/80 md:text-sm">Authentic Recipe</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="text-gold font-semibold text-sm uppercase tracking-widest">Our Story</span>
            <h2 className="mt-3 mb-6 font-serif text-3xl font-bold text-foreground md:text-5xl">
              A Family Recipe,
              <br />
              <span className="text-cajun">A Louisiana Legacy</span>
            </h2>
            <div className="space-y-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              <p>
                Every Mame's meat pie carries the soul of Cane River, Louisiana — where family
                recipes were treasured like heirlooms and Sunday meals brought everyone together.
              </p>
              <p>
                Inspired by Mame's own kitchen, our recipe has been passed down through generations,
                preserving the authentic flavors of Cane River Louisiana's rich culinary heritage.
                Each pie is handcrafted with premium ingredients and seasoned with the same love and
                care that Mame put into every batch.
              </p>
              <p>
                Now based in Houston, Texas, we're on a mission to bring authentic Cane River
                comfort food to more tables — from family dinners to events, from local markets
                to kitchens across the country.
              </p>
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 border-t border-border pt-6 sm:grid-cols-3 sm:gap-6 sm:border-t-0 sm:pt-0">
              <div className="text-center sm:border-r sm:border-border sm:pr-6">
                <p className="font-serif text-2xl font-bold text-cajun">Cane River</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Louisiana Roots</p>
              </div>
              <div className="text-center sm:border-r sm:border-border sm:px-6">
                <p className="font-serif text-2xl font-bold text-cajun">Houston</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Texas Made</p>
              </div>
              <div className="text-center sm:pl-6">
                <p className="font-serif text-2xl font-bold text-cajun">Family</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Recipe Heritage</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutSection;
