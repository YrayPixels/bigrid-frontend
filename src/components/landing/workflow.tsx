const steps = [
  {
    n: "01",
    title: "Onboard",
    desc: "We spin up your tenant, import students & staff, and ship your branded site.",
  },
  {
    n: "02",
    title: "Operate",
    desc: "Run admissions, classes, attendance and fees from one secure dashboard.",
  },
  {
    n: "03",
    title: "Engage",
    desc: "Parents and students get instant access to results, payments and messages.",
  },
  {
    n: "04",
    title: "Improve",
    desc: "Analytics reveal what's working — attendance risks, fee gaps, performance.",
  },
];

export function Workflow() {
  return (
    <section id="product" className="bg-primary py-24 text-primary-foreground">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-12 md:grid-cols-2 md:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
              How it works
            </p>
            <h2 className="mt-3 font-display text-4xl font-semibold text-balance md:text-5xl">
              From paper-and-pen to a digital school in{" "}
              <span className="italic text-accent">one term</span>.
            </h2>
          </div>
          <p className="text-lg text-primary-foreground/70">
            Our onboarding team migrates your data, trains your staff, and stays with you through
            your first full academic cycle. You focus on teaching — we handle the operating system.
          </p>
        </div>
        <ol className="mt-16 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/5 md:grid-cols-4">
          {steps.map((s) => (
            <li key={s.n} className="relative bg-primary p-8">
              <span className="font-display text-5xl font-semibold text-accent/80">{s.n}</span>
              <h3 className="mt-6 text-xl font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-primary-foreground/70">{s.desc}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
