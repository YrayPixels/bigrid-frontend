import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "How quickly can my school go live?",
    a: "Most schools launch within 7–14 days. Our team handles data migration, branding, and staff training.",
  },
  {
    q: "Can we use our own domain?",
    a: "Yes. On Professional and Enterprise plans you can connect schoolname.com with one-click SSL.",
  },
  {
    q: "Which payment gateways are supported?",
    a: "Paystack, Flutterwave and Monnify out of the box. We can add more for Enterprise customers.",
  },
  {
    q: "Is our data isolated from other schools?",
    a: "Every record is scoped by tenant_id with enforced row-level isolation, audit logs, and encrypted backups.",
  },
  {
    q: "Do parents need to install an app?",
    a: "No. The parent and student portals run in any modern browser. A native mobile app ships in Phase 2.",
  },
  {
    q: "What if we already use another system?",
    a: "We import from spreadsheets and most major school systems. Migration support is included.",
  },
];

export function FAQ() {
  return (
    <section id="faq" className="bg-gradient-soft py-24">
      <div className="mx-auto max-w-3xl px-6">
        <div className="text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">FAQ</p>
          <h2 className="mt-3 font-display text-4xl font-semibold text-balance md:text-5xl">
            Questions, answered.
          </h2>
        </div>
        <Accordion type="single" collapsible className="mt-12 space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="rounded-xl border border-border bg-card px-5 shadow-card"
            >
              <AccordionTrigger className="text-left font-medium hover:no-underline">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
