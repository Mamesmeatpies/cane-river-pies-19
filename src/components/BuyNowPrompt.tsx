import { useState, type FormEvent, type ReactNode } from "react";
import { useAction } from "convex/react";
import { Phone } from "lucide-react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import meatPiesImage from "@/assets/mini-pies-tray.png";
import mameLegacyPhoto from "@/assets/mame-portrait-2026 2.jpg";

type BuyNowPromptProps = {
  children: ReactNode;
  className?: string;
  onOpen?: () => void;
};

const goToSection = (sectionId: "shop" | "locations") => {
  window.history.pushState(null, "", `#${sectionId}`);
  window.setTimeout(() => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, 0);
};

const BuyNowPrompt = ({ children, className, onOpen }: BuyNowPromptProps) => {
  const submitNewsletterSignup = useAction(api.notifications.submitNewsletterSignup);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [humanAnswer, setHumanAnswer] = useState<"pies" | "mame" | "phone" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const isHuman = humanAnswer === "pies";

  const handleSignup = async (event: FormEvent) => {
    event.preventDefault();
    if (!isHuman) {
      toast.error("Please confirm that you're human.");
      return;
    }
    setSubmitting(true);

    try {
      const result = await submitNewsletterSignup({ name: name.trim() || undefined, email: email.trim() });
      toast.success(result.alreadySubscribed ? "You're already on the list!" : "Welcome to Mame's list!", {
        description: result.alreadySubscribed
          ? "We already have this email, so you're all set."
          : "Watch your inbox for specials, local pickup dates, and new flavors.",
      });
      setName("");
      setEmail("");
      setHumanAnswer(null);
      setOpen(false);
      goToSection("shop");
    } catch {
      toast.error("We couldn't add you to the list. You can still shop now.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <button type="button" onClick={onOpen} className={cn(className)}>
          {children}
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="w-[calc(100%-2rem)] overflow-hidden border-gold/30 bg-cream p-0 sm:max-w-md">
      <div className="h-2 bg-gradient-to-r from-cajun via-gold to-cajun" />
      <div className="p-6 sm:p-8">
        <AlertDialogHeader className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-cajun">Fresh from Mame's kitchen</p>
          <AlertDialogTitle className="font-serif text-2xl text-charcoal sm:text-3xl">
            Get first dibs on Mame's pies
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm leading-relaxed sm:text-base">
            Join our email list for specials, new flavors, pop-ups, and local pickup dates—then start your order.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleSignup} className="mt-6 space-y-3">
          <label className="sr-only" htmlFor="buy-now-list-name">Your name</label>
          <input
            id="buy-now-list-name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your name (optional)"
            maxLength={100}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-cajun/50"
          />
          <label className="sr-only" htmlFor="buy-now-list-email">Email address</label>
          <input
            id="buy-now-list-email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email address"
            required
            maxLength={255}
            className="w-full rounded-xl border border-border bg-background px-4 py-3 text-foreground outline-none transition-shadow placeholder:text-muted-foreground focus:ring-2 focus:ring-cajun/50"
          />
          <fieldset className="rounded-xl border border-border bg-background p-3">
            <legend className="px-1 text-sm font-semibold text-foreground">Are you human?</legend>
            <p className="mb-3 text-xs text-muted-foreground">Select the picture that contains meat pies.</p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "pies" as const, label: "Meat pies" },
                { id: "mame" as const, label: "Mame" },
                { id: "phone" as const, label: "Phone" },
              ].map((option) => (
                <label
                  key={option.id}
                  className={cn(
                    "cursor-pointer overflow-hidden rounded-lg border-2 bg-muted transition-all focus-within:ring-2 focus-within:ring-cajun/50",
                    humanAnswer === option.id ? "border-cajun ring-2 ring-cajun/20" : "border-transparent hover:border-gold/60",
                  )}
                >
                  <input
                    type="radio"
                    name="human-picture-check"
                    value={option.id}
                    checked={humanAnswer === option.id}
                    onChange={() => setHumanAnswer(option.id)}
                    className="sr-only"
                    required
                  />
                  {option.id !== "phone" ? (
                    <img
                      src={option.id === "pies" ? meatPiesImage : mameLegacyPhoto}
                      alt={option.id === "pies" ? "A tray of meat pies" : "A portrait of Mame in a red jacket"}
                      className="aspect-square w-full object-cover"
                    />
                  ) : (
                    <span className="flex aspect-square w-full flex-col items-center justify-center gap-2 bg-cream-dark text-cajun" aria-label={option.label}>
                      <Phone size={38} aria-hidden="true" />
                      <span className="text-xs font-bold uppercase tracking-wide">{option.label}</span>
                    </span>
                  )}
                </label>
              ))}
            </div>
            {humanAnswer && !isHuman && (
              <p className="mt-2 text-xs font-semibold text-destructive">That is not the meat-pie picture. Try again.</p>
            )}
            {isHuman && <p className="mt-2 text-xs font-semibold text-emerald-700">Human check complete.</p>}
          </fieldset>
          <button
            type="submit"
            disabled={submitting || !isHuman}
            className="w-full rounded-full bg-cajun py-3 font-semibold text-cream transition-colors hover:bg-cajun-light disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? "Joining..." : "Join the list & shop"}
          </button>
        </form>
        <AlertDialogFooter className="mt-3 gap-2 sm:flex-col sm:space-x-0">
          <AlertDialogCancel
            onClick={() => goToSection("shop")}
            className="mt-0 w-full rounded-full border-gold/50 py-3 text-charcoal hover:bg-gold/10"
          >
            Skip for now—show me the pies
          </AlertDialogCancel>
          <button
            type="button"
            onClick={() => { setOpen(false); goToSection("locations"); }}
            className="w-full py-2 text-sm font-semibold text-cajun transition-colors hover:text-cajun-light"
          >
            Find a retail location
          </button>
        </AlertDialogFooter>
      </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default BuyNowPrompt;
