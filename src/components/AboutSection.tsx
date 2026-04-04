import mameImg from "@/assets/mame-kitchen-2.jpg";

const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-16 items-center">
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
            <div className="absolute -bottom-6 -right-4 md:right-auto md:-left-6 bg-cajun text-cream rounded-2xl p-6 shadow-xl text-center">
              <p className="font-serif text-3xl font-bold">100%</p>
              <p className="text-sm text-cream/80">Authentic Recipe</p>
            </div>
          </div>

          {/* Content */}
          <div>
            <span className="text-gold font-semibold text-sm uppercase tracking-widest">Our Story</span>
            <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mt-3 mb-6">
              A Family Recipe,
              <br />
              <span className="text-cajun">A Louisiana Legacy</span>
            </h2>
            <div className="space-y-4 text-muted-foreground leading-relaxed">
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

            <div className="flex flex-wrap gap-6 mt-8">
              <div className="text-center">
                <p className="font-serif text-2xl font-bold text-cajun">Cane River</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Louisiana Roots</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
                <p className="font-serif text-2xl font-bold text-cajun">Houston</p>
                <p className="text-xs text-muted-foreground uppercase tracking-wider mt-1">Texas Made</p>
              </div>
              <div className="w-px bg-border" />
              <div className="text-center">
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
