import {
  Globe,
  Users,
  ClipboardCheck,
  Wallet,
  GraduationCap,
  MessagesSquare,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

const modules = [
  {
    icon: Globe,
    title: "Website Builder",
    desc: "Branded school website with reusable blocks. Custom domain ready.",
  },
  {
    icon: Users,
    title: "Admissions",
    desc: "Online applications, document uploads, entrance exams, acceptance fees.",
  },
  {
    icon: GraduationCap,
    title: "Academics",
    desc: "Classes, subjects, timetables, assignments, lesson plans, exams.",
  },
  {
    icon: ClipboardCheck,
    title: "Attendance",
    desc: "Daily, QR, RFID and biometric attendance for students and staff.",
  },
  {
    icon: Wallet,
    title: "Finance & Fees",
    desc: "Invoicing, Paystack & Flutterwave, debtor reports, payroll.",
  },
  {
    icon: MessagesSquare,
    title: "Parent & Student Portals",
    desc: "Results, attendance, fees and announcements — anywhere.",
  },
  {
    icon: BarChart3,
    title: "Analytics",
    desc: "Real-time school and platform dashboards. Forecast revenue & risk.",
  },
  {
    icon: ShieldCheck,
    title: "Secure Multi-Tenant",
    desc: "Strict tenant isolation, RBAC, audit logs, 2FA, signed URLs.",
  },
];

export function Modules() {
  return (
    <section id="modules" className="bg-gradient-soft py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-primary-glow">
            Modules
          </p>
          <h2 className="mt-3 text-4xl font-semibold text-balance md:text-5xl">
            Every system your school needs, woven together.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            No more spreadsheets, no more disconnected tools. SchoolOS unifies the workflows that
            move your school forward — from a parent's first visit to graduation day.
          </p>
        </div>
        <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {modules.map((m) => (
            <div
              key={m.title}
              className="group relative rounded-2xl border border-border bg-card p-6 shadow-card transition-smooth hover:-translate-y-1 hover:shadow-elegant"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-hero text-primary-foreground shadow-glow">
                <m.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 font-display text-xl font-semibold">{m.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{m.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
