import { useState, type FormEvent, type ReactNode } from "react";
import { useAction } from "convex/react";
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
  const [isHuman, setIsHuman] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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
      setIsHuman(false);
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
          <label className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm text-foreground">
            <input
              type="checkbox"
              checked={isHuman}
              onChange={(event) => setIsHuman(event.target.checked)}
              required
              className="h-5 w-5 shrink-0 accent-cajun"
            />
            <span>
              <span className="block font-semibold">Are you human?</span>
              <span className="block text-xs text-muted-foreground">Yes, I am a real person.</span>
            </span>
          </label>
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
