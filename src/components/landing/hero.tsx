import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles } from "lucide-react";
import heroImg from "@/assets/hero-classroom.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_20%_10%,oklch(0.78_0.13_75/.4),transparent_40%),radial-gradient(circle_at_80%_60%,oklch(0.48_0.14_255/.6),transparent_50%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-6 py-24 md:grid-cols-2 md:py-32 md:gap-8 lg:gap-16 items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            Now in beta — onboarding founding schools
          </div>
          <h1 className="mt-6 text-5xl font-semibold leading-[1.05] text-balance md:text-6xl lg:text-7xl">
            One platform to <span className="italic text-accent">run</span> your entire school.
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-primary-foreground/80">
            SchoolOS combines your school website, admissions, student records, attendance, exams,
            and finance into a single secure cloud. Launch in days, not months.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Button
              size="lg"
              className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-elegant"
            >
              Start free trial <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="border-white/20 bg-white/5 text-primary-foreground hover:bg-white/10"
            >
              Watch 2-min demo
            </Button>
          </div>
          <dl className="mt-12 grid max-w-md grid-cols-3 gap-6">
            {[
              ["120+", "Schools onboarding"],
              ["45k", "Students managed"],
              ["99.9%", "Uptime SLA"],
            ].map(([k, v]) => (
              <div key={v}>
                <dt className="font-display text-3xl font-semibold text-accent">{k}</dt>
                <dd className="mt-1 text-xs uppercase tracking-wider text-primary-foreground/60">
                  {v}
                </dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative">
          <div className="absolute -inset-4 rounded-3xl bg-accent/20 blur-3xl" />
          <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-elegant">
            <img
              src={heroImg.src}
              alt="Students learning in a modern classroom using SchoolOS"
              width={1600}
              height={1100}
              className="h-full w-full object-cover"
            />
            <div className="absolute bottom-4 left-4 right-4 rounded-xl border border-white/15 bg-background/90 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Live tenant
                  </p>
                  <p className="font-display text-lg font-semibold text-foreground">
                    greatheights.schoolos.app
                  </p>
                </div>
                <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-foreground">
                  ● Online
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
