"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Check, Sparkles, Star } from "lucide-react";
import confetti from "canvas-confetti";
import NumberFlow from "@number-flow/react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

export interface PricingPlan {
  name: string;
  /** Monthly rate in USD, billed monthly. */
  price: string;
  /** Monthly-equivalent rate in USD, billed annually. */
  yearlyPrice: string;
  period: string;
  features: string[];
  description: string;
  buttonText: string;
  href: string;
  isPopular: boolean;
}

/** care-io palette — confetti matches the brand greens/warms. */
const CONFETTI_COLORS = ["#4a7c74", "#1acd81", "#d4c8b8", "#c47a5a"];

export const SCOPEBRIDGE_PLANS: PricingPlan[] = [
  {
    name: "Starter",
    price: "29",
    yearlyPrice: "23",
    period: "month",
    features: [
      "3 active projects",
      "Client portal + e-signatures",
      "AI requirement checklists",
      "Change-request firewall",
    ],
    description: "For solo freelancers who want the basics locked down.",
    buttonText: "Start free",
    href: "/register",
    isPopular: false,
  },
  {
    name: "Studio",
    price: "79",
    yearlyPrice: "63",
    period: "month",
    features: [
      "Unlimited projects & clients",
      "Full change-request firewall",
      "Traceability chain + audit log",
      "Task boards & AI acceptance criteria",
      "Priority support",
    ],
    description: "For growing agencies — one lost scope pays for a year.",
    buttonText: "Go Studio",
    href: "/register",
    isPopular: true,
  },
  {
    name: "Scale",
    price: "149",
    yearlyPrice: "119",
    period: "month",
    features: [
      "Everything in Studio",
      "SSO & advanced roles",
      "Unlimited audit retention",
      "Migration & onboarding help",
      "Dedicated support",
    ],
    description: "For multi-team shops that bill on scope.",
    buttonText: "Talk to us",
    href: "/register",
    isPopular: false,
  },
];

interface PricingProps {
  plans?: PricingPlan[];
  title?: string;
  description?: string;
}

export function Pricing({
  plans = SCOPEBRIDGE_PLANS,
  title = "One lost scope pays for a year",
  description = "Start monthly, switch to annual and save 20%. Cancel any time — your data is yours.",
}: PricingProps) {
  const [isMonthly, setIsMonthly] = useState(true);
  const isDesktop = useMediaQuery("(min-width: 768px)");
  const switchRef = useRef<HTMLButtonElement>(null);

  const handleToggle = (checked: boolean) => {
    setIsMonthly(!checked);
    if (checked && switchRef.current) {
      // Confetti is pure celebration — skip for reduced-motion users.
      const reduced =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) return;
      const rect = switchRef.current.getBoundingClientRect();
      confetti({
        particleCount: 50,
        spread: 60,
        origin: {
          x: (rect.left + rect.width / 2) / window.innerWidth,
          y: (rect.top + rect.height / 2) / window.innerHeight,
        },
        colors: CONFETTI_COLORS,
        ticks: 200,
        gravity: 1.2,
        decay: 0.94,
        startVelocity: 30,
        shapes: ["circle"],
      });
    }
  };

  return (
    <div className="w-full">
      <div className="mb-10 flex flex-col items-center gap-4 text-center">
        <div className="flex items-center justify-center gap-3">
          <span className="h-px w-8 bg-sage-500/60" />
          <span className="text-xs font-medium uppercase tracking-[0.2em] text-sage-500">Pricing</span>
          <span className="h-px w-8 bg-sage-500/60" />
        </div>
        <h2 className="section-title mx-auto max-w-2xl">{title}</h2>
        <p className="body-copy max-w-xl text-[17px]">{description}</p>
      </div>

      <div className="mb-12 flex items-center justify-center gap-3">
        <span className={cn("text-sm font-semibold transition-colors", isMonthly ? "text-ink dark:text-warm-50" : "text-warm-500")}>
          Monthly
        </span>
        <Switch
          ref={switchRef}
          checked={!isMonthly}
          onCheckedChange={handleToggle}
          aria-label="Toggle annual billing"
        />
        <span className={cn("text-sm font-semibold transition-colors", !isMonthly ? "text-ink dark:text-warm-50" : "text-warm-500")}>
          Annual <span className="text-sage-600 dark:text-sage-400">(Save 20%)</span>
        </span>
      </div>

      <div className="grid grid-cols-1 items-center gap-5 md:grid-cols-3">
        {plans.map((plan, index) => (
          <motion.div
            key={plan.name}
            initial={{ y: 50, opacity: 0 }}
            whileInView={
              isDesktop
                ? {
                    y: plan.isPopular ? -20 : 0,
                    opacity: 1,
                    x: index === 2 ? -30 : index === 0 ? 30 : 0,
                    scale: index === 0 || index === 2 ? 0.94 : 1.0,
                  }
                : {}
            }
            viewport={{ once: true }}
            transition={{
              duration: 1.6,
              type: "spring",
              stiffness: 100,
              damping: 30,
              delay: 0.4,
              opacity: { duration: 0.5 },
            }}
            className={cn(
              "relative flex flex-col rounded-[2rem] border-[1px] bg-white p-6 text-center dark:bg-[#161310]",
              plan.isPopular ? "border-2 border-sage-600 shadow-soft" : "border-warm-200/70 shadow-card",
              !plan.isPopular && "mt-5",
              // Fan-out tilt is desktop-only; stacked mobile cards stay flat.
              index === 0 || index === 2 ? "z-0" : "z-10",
              index === 0 && "lg:origin-right lg:rotate-y-[10deg]",
              index === 2 && "lg:origin-left lg:rotate-y-[10deg]",
            )}
          >
            {plan.isPopular && (
              <div className="absolute right-0 top-0 flex items-center rounded-bl-2xl rounded-tr-2xl bg-sage-600 px-3 py-1">
                <Star aria-hidden="true" className="h-4 w-4 fill-current text-warm-50" />
                <span className="ml-1 font-semibold text-warm-50">Popular</span>
              </div>
            )}
            <div className="flex flex-1 flex-col">
              <p className="font-serif text-xl text-ink dark:text-warm-50">{plan.name}</p>
              <div className="mt-6 flex items-center justify-center gap-x-2" aria-live="polite" aria-atomic="true">
                <span className="font-serif text-5xl font-bold tracking-tight text-ink dark:text-warm-50">
                  <NumberFlow
                    value={isMonthly ? Number(plan.price) : Number(plan.yearlyPrice)}
                    format={{ style: "currency", currency: "USD", minimumFractionDigits: 0, maximumFractionDigits: 0 }}
                    transformTiming={{ duration: 500, easing: "ease-out" }}
                    willChange
                    className="tabular-nums"
                  />
                </span>
                <span className="text-sm font-semibold leading-6 tracking-wide text-warm-500">/ {plan.period}</span>
              </div>

              <p className="text-xs leading-5 text-warm-500">{isMonthly ? "billed monthly" : "billed annually"}</p>

              <ul className="mt-6 flex flex-col gap-2.5">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <Check aria-hidden="true" className={cn("mt-1 h-4 w-4 flex-shrink-0", plan.isPopular ? "text-teal-400" : "text-sage-600")} />
                    <span className="text-left text-[15px] text-warm-700 dark:text-warm-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <hr className="my-5 w-full border-warm-200/70 dark:border-white/10" />

              <Link
                href={plan.href}
                className={cn(
                  "group relative w-full gap-2 overflow-hidden rounded-full py-3 text-lg font-semibold tracking-tight transition-all duration-300 ease-out active:scale-[0.98]",
                  plan.isPopular
                    ? "bg-sage-600 text-white shadow-lg shadow-sage-600/25 hover:bg-sage-700"
                    : "bg-ink text-warm-50 hover:bg-warm-800 dark:bg-warm-50 dark:text-ink dark:hover:bg-warm-100",
                )}
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {plan.buttonText}
                  {plan.isPopular && <Sparkles size={16} className="opacity-70 transition-transform group-hover:rotate-12" />}
                </span>
              </Link>
              <p className="mt-5 text-xs leading-5 text-warm-500">{plan.description}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}