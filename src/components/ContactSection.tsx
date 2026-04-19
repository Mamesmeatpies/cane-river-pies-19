import { useState } from "react";
import { useAction } from "convex/react";
import { Bell, Phone, Mail, Send } from "lucide-react";
import { api } from "../../convex/_generated/api";
import { useToast } from "@/hooks/use-toast";

const ContactSection = () => {
  const { toast } = useToast();
  const submitContactMessage = useAction(api.notifications.submitContactMessage);
  const submitNewsletterSignup = useAction(api.notifications.submitNewsletterSignup);
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" });
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await submitContactMessage({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        message: form.message.trim(),
      });
      toast({ title: "Message Sent!", description: "We'll get back to you soon." });
      setForm({ name: "", email: "", phone: "", message: "" });
    } catch {
      toast({
        title: "Message not sent",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setNewsletterSubmitting(true);

    try {
      const result = await submitNewsletterSignup({
        email: newsletterEmail.trim(),
      });

      toast({
        title: result.alreadySubscribed ? "You're already on the list!" : "You're on the list!",
        description: "We'll send Mame's updates, specials, and event news your way.",
      });
      setNewsletterEmail("");
    } catch {
      toast({
        title: "Signup not saved",
        description: "Please try again or email us directly.",
        variant: "destructive",
      });
    } finally {
      setNewsletterSubmitting(false);
    }
  };

  return (
    <section id="contact" className="bg-background py-16 md:py-24">
      <div className="container mx-auto px-4">
        <div className="mb-12 text-center md:mb-16">
          <span className="text-gold font-semibold text-sm uppercase tracking-widest">Get in Touch</span>
          <h2 className="mt-3 mb-4 font-serif text-3xl font-bold text-foreground md:text-5xl">
            Contact Us
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Interested in orders, events, wholesale, or retail opportunities? Reach out to us.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl gap-10 md:grid-cols-2 md:gap-12">
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

            <div className="mt-8 rounded-2xl bg-cajun p-6 text-cream sm:p-8">
              <h3 className="font-serif text-xl font-bold mb-3">Ready to Partner?</h3>
              <p className="text-cream/80 text-sm leading-relaxed">
                We're always looking for new retail locations, event opportunities, and wholesale partnerships. 
                Let's bring Mame's to more tables together.
              </p>
            </div>

            <div className="rounded-lg border border-gold/40 bg-card p-6 shadow-sm sm:p-7">
              <div className="mb-5 flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gold/15">
                  <Bell className="text-cajun" size={20} />
                </div>
                <div>
                  <span className="text-gold text-xs font-semibold uppercase tracking-widest">Be in the Know</span>
                  <h3 className="mt-1 font-serif text-2xl font-bold text-foreground">Join our email list</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    Get first word on pop-ups, holiday ordering, new flavors, and local pickup dates.
                  </p>
                </div>
              </div>

              <form onSubmit={handleNewsletterSubmit} className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  placeholder="Email Address"
                  required
                  maxLength={255}
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-border bg-background px-4 py-3 text-foreground placeholder:text-muted-foreground transition-all focus:outline-none focus:ring-2 focus:ring-cajun/50"
                />
                <button
                  type="submit"
                  disabled={newsletterSubmitting}
                  className="rounded-lg bg-cajun px-5 py-3 font-semibold text-primary-foreground transition-all hover:bg-cajun-light hover:shadow-md disabled:opacity-50"
                >
                  {newsletterSubmitting ? "Joining..." : "Join"}
                </button>
              </form>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
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
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 bg-cajun hover:bg-cajun-light text-primary-foreground py-4 rounded-full font-semibold text-lg transition-all hover:shadow-lg disabled:opacity-50"
            >
              <Send size={18} />
              {submitting ? "Sending..." : "Send Message"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
