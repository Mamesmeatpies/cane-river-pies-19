import { Star } from "lucide-react";

const testimonials = [
  {
    text: "Best meat pies I've had outside Louisiana. The crust is golden perfection and the filling is seasoned just right.",
    name: "Danielle R.",
    location: "Houston, TX",
  },
  {
    text: "You can taste the family recipe in every bite. These are the real deal — authentic Cane River flavor.",
    name: "Marcus T.",
    location: "Baton Rouge, LA",
  },
  {
    text: "A true Southern comfort food experience. I ordered for a party and everyone was raving about them!",
    name: "Ashley M.",
    location: "Dallas, TX",
  },
  {
    text: "Perfect for parties, events, and family gatherings. The mini pies are always the first thing to disappear.",
    name: "James P.",
    location: "Houston, TX",
  },
];

const TestimonialsSection = () => {
  return (
    <section id="testimonials" className="bg-charcoal py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center md:mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Testimonials</span>
          <h2 className="mt-3 mb-4 font-serif text-3xl font-bold text-cream md:text-5xl">
            What Our Customers Say
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-2xl border border-gold/10 bg-charcoal-light p-6 transition-all duration-300 hover:border-gold/30 sm:p-8"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={16} className="fill-gold text-gold" />
                ))}
              </div>
              <p className="mb-6 font-sans italic leading-relaxed text-cream/80">"{t.text}"</p>
              <div>
                <p className="text-cream font-semibold">{t.name}</p>
                <p className="text-gold/60 text-sm">{t.location}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TestimonialsSection;
