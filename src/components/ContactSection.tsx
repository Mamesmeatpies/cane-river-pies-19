import { useState } from "react";
import { Phone, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ContactSection = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast({ title: "Message Sent!", description: "We'll get back to you soon." });
    setForm({ name: "", email: "", phone: "", message: "" });
  };

  return (
    <section id="contact" className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Get in Touch</span>
          <h2 className="font-serif text-3xl md:text-5xl font-bold text-foreground mt-3 mb-4">
            Contact Us
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Interested in orders, events, wholesale, or retail opportunities? Reach out to us.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Info */}
          <div className="space-y-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-cajun/10 flex items-center justify-center shrink-0">
                <Phone className="text-cajun" size={20} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">Phone</h3>
                <a href="tel:8003187135" className="text-muted-foreground hover:text-cajun transition-colors">
                  800-318-7135
                </a>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-cajun/10 flex items-center justify-center shrink-0">
                <Mail className="text-cajun" size={20} />
              </div>
              <div>
                <h3 className="font-serif text-lg font-bold text-foreground">Email</h3>
                <a href="mailto:mamesmeatpies@gmail.com" className="text-muted-foreground hover:text-cajun transition-colors">
                  mamesmeatpies@gmail.com
                </a>
              </div>
            </div>

            <div className="bg-cajun rounded-2xl p-8 text-cream mt-8">
              <h3 className="font-serif text-xl font-bold mb-3">Ready to Partner?</h3>
              <p className="text-cream/80 text-sm leading-relaxed">
                We're always looking for new retail locations, event opportunities, and wholesale partnerships. 
                Let's bring Mame's to more tables together.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <input
              type="text"
              placeholder="Your Name"
              required
              maxLength={100}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-5 py-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cajun/50 transition-all"
            />
            <input
              type="email"
              placeholder="Email Address"
              required
              maxLength={255}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full px-5 py-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cajun/50 transition-all"
            />
            <input
              type="tel"
              placeholder="Phone Number"
              maxLength={20}
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full px-5 py-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cajun/50 transition-all"
            />
            <textarea
              placeholder="Your Message"
              required
              maxLength={1000}
              rows={5}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              className="w-full px-5 py-4 rounded-xl border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-cajun/50 transition-all resize-none"
            />
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-4 rounded-full font-semibold text-lg transition-all hover:shadow-lg"
            >
              <Send size={18} />
              Send Message
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
