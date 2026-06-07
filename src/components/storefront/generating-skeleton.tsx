"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

export function GeneratingSkeleton() {
  const [phase, setPhase] = useState(0);
  const phases = [
    "Analyzing your business...",
    "Writing your hero copy...",
    "Generating value props...",
    "Polishing SEO metadata...",
  ];

  useEffect(() => {
    const timer = setInterval(
      () => setPhase((currentPhase) => (currentPhase + 1) % phases.length),
      700,
    );
    return () => clearInterval(timer);
  }, [phases.length]);

  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-canvas-raised p-12 shadow-elevated">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="font-display text-lg font-semibold">{phases[phase]}</span>
      </div>
      <div className="mt-8 space-y-3">
        <div className="h-8 w-2/3 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-3/4 animate-pulse rounded bg-secondary" />
        <div className="h-4 w-1/2 animate-pulse rounded bg-secondary" />
        <div className="mt-6 grid grid-cols-3 gap-4">
          <div className="h-20 animate-pulse rounded bg-secondary" />
          <div className="h-20 animate-pulse rounded bg-secondary" />
          <div className="h-20 animate-pulse rounded bg-secondary" />
        </div>
      </div>
    </div>
  );
}
