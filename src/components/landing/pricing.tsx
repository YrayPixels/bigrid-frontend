import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

const tiers = [
  {
    name: "Basic",
    price: "₦25k",
    period: "/ month",
    blurb: "Get online with a beautiful site and core student records.",
    features: [
      "School website",
      "Student records",
      "Attendance",
      "Up to 200 students",
      "Email support",
    ],
  },
  {
    name: "Professional",
    price: "₦75k",
    period: "/ month",
    blurb: "Run academics, finance and parent engagement end-to-end.",
    features: [
      "Everything in Basic",
      "Academic management",
      "Finance & invoicing",
      "Parent & student portals",
      "Up to 1,500 students",
      "Priority support",
    ],
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    blurb: "Full ERP, advanced analytics and custom domains for large groups.",
    features: [
      "Everything in Professional",
      "Advanced analytics & AI",
      "Custom domains",
      "API access",
      "Unlimited students",
      "Dedicated success manager",
    ],
  },
];

export function Pricing() {
  return (
    <section id="pricing" className="bg-background py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
            Pricing
          </p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-balance md:text-5xl">
            Fair, transparent pricing that grows with your school.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            Start small, expand modules as you need them. All plans include hosting, security and
            updates.
          </p>
        </div>
        <div className="mt-14 grid gap-6 lg:grid-cols-3">
          {tiers.map((t) => (
            <div
              key={t.name}
              className={`relative flex flex-col rounded-2xl border p-8 transition-smooth ${
                t.featured
                  ? "border-transparent bg-gradient-hero text-primary-foreground shadow-elegant lg:-translate-y-4"
                  : "border-border bg-card shadow-card hover:-translate-y-1"
              }`}
            >
              {t.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-2xl font-semibold">{t.name}</h3>
              <p
                className={`mt-2 text-sm ${t.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}
              >
                {t.blurb}
              </p>
              <div className="mt-6 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold">{t.price}</span>
                <span
                  className={`text-sm ${t.featured ? "text-primary-foreground/70" : "text-muted-foreground"}`}
                >
                  {t.period}
                </span>
              </div>
              <ul className="mt-8 space-y-3">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check
                      className={`mt-0.5 h-4 w-4 shrink-0 ${t.featured ? "text-accent" : "text-primary-glow"}`}
                    />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button
                className={`mt-10 w-full ${
                  t.featured
                    ? "bg-accent text-accent-foreground hover:bg-accent/90"
                    : "bg-primary text-primary-foreground hover:bg-primary/90"
                }`}
                size="lg"
              >
                {t.name === "Enterprise" ? "Talk to sales" : "Start free trial"}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
