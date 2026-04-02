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
    <section id="testimonials" className="py-24 bg-charcoal">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Testimonials</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-cream mt-3 mb-4">
            What Our Customers Say
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="bg-charcoal-light rounded-2xl p-8 border border-gold/10 hover:border-gold/30 transition-all duration-300"
            >
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} size={16} className="fill-gold text-gold" />
                ))}
              </div>
              <p className="text-cream/80 leading-relaxed mb-6 italic font-sans">"{t.text}"</p>
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
