import { GraduationCap } from "lucide-react";

export function SiteFooter() {
  const cols = [
    {
      title: "Platform",
      links: ["Website Builder", "Student Management", "Admissions", "Finance", "Parent Portal"],
    },
    { title: "Company", links: ["About", "Customers", "Careers", "Contact"] },
    { title: "Resources", links: ["Docs", "Help Center", "Status", "Changelog"] },
  ];
  return (
    <footer className="border-t border-border bg-secondary/40">
      <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-5">
        <div className="md:col-span-2">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-hero">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-semibold">SchoolOS</span>
          </div>
          <p className="mt-4 max-w-sm text-sm text-muted-foreground">
            The operating system for modern schools. Website, admissions, academics, finance — one
            platform.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <h4 className="text-sm font-semibold text-foreground">{c.title}</h4>
            <ul className="mt-4 space-y-3">
              {c.links.map((l) => (
                <li key={l}>
                  <a href="#" className="text-sm text-muted-foreground hover:text-foreground">
                    {l}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground md:flex-row">
          <p>© {new Date().getFullYear()} SchoolOS. All rights reserved.</p>
          <p>Built for schools across Africa and beyond.</p>
        </div>
      </div>
    </footer>
  );
}
