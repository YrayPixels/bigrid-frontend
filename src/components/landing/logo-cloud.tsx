export function LogoCloud() {
  const names = [
    "Great Heights",
    "Loyola College",
    "Bright Future",
    "St. Augustine's",
    "Crescent Academy",
    "Royal Hills",
  ];
  return (
    <section className="border-y border-border bg-background py-12">
      <div className="mx-auto max-w-7xl px-6">
        <p className="text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Trusted by forward-thinking schools
        </p>
        <div className="mt-8 grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-6">
          {names.map((n) => (
            <div
              key={n}
              className="text-center font-display text-lg font-medium text-muted-foreground/70 transition-colors hover:text-foreground"
            >
              {n}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
