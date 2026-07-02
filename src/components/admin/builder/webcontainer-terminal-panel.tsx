"use client";

import { useEffect, useRef } from "react";
import { Terminal } from "lucide-react";
import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTerm } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { subscribeWebContainerOutput } from "@/lib/bolt/webcontainer-output";
import { attachWebContainerShell } from "@/lib/bolt/webcontainer-terminal";
import { cn } from "@/lib/utils";

function getTerminalTheme() {
  return {
    background: "#0d1117",
    foreground: "#c9d1d9",
    cursor: "#c9d1d9",
    cursorAccent: "#0d1117",
    selectionBackground: "#264f78",
    black: "#484f58",
    red: "#ff7b72",
    green: "#3fb950",
    yellow: "#d29922",
    blue: "#58a6ff",
    magenta: "#bc8cff",
    cyan: "#39c5cf",
    white: "#b1bac4",
    brightBlack: "#6e7681",
    brightRed: "#ffa198",
    brightGreen: "#56d364",
    brightYellow: "#e3b341",
    brightBlue: "#79c0ff",
    brightMagenta: "#d2a8ff",
    brightCyan: "#56d4dd",
    brightWhite: "#f0f6fc",
  };
}

export function WebContainerTerminalPanel({ className }: { className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const shellRef = useRef<Awaited<ReturnType<typeof attachWebContainerShell>> | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const fitAddon = new FitAddon();
    const xterm = new XTerm({
      cursorBlink: true,
      convertEol: true,
      fontSize: 12,
      fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace',
      theme: getTerminalTheme(),
      scrollback: 5000,
      rightClickSelectsWord: true,
    });

    xterm.loadAddon(fitAddon);
    xterm.loadAddon(new WebLinksAddon());
    xterm.open(container);

    const unsubscribeOutput = subscribeWebContainerOutput((chunk) => {
      xterm.write(chunk);
    });

    let cancelled = false;
    let resizeObserver: ResizeObserver | undefined;

    const safeFit = () => {
      if (cancelled || !container.isConnected) return;
      try {
        fitAddon.fit();
      } catch {
        // xterm can throw when the panel is hidden or mid-dispose (zero dimensions).
      }
    };

    (async () => {
      try {
        safeFit();
        const shell = await attachWebContainerShell({
          terminal: xterm,
        });
        if (cancelled) {
          shell.kill();
          return;
        }
        shellRef.current = shell;

        resizeObserver = new ResizeObserver(() => {
          if (cancelled) return;
          safeFit();
          shell.resize(xterm.cols, xterm.rows);
        });
        resizeObserver.observe(container);
      } catch (e) {
        if (!cancelled) {
          const message = e instanceof Error ? e.message : "unknown error";
          xterm.write(`\r\n\x1b[31mFailed to start shell: ${message}\x1b[0m\r\n`);
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubscribeOutput();
      resizeObserver?.disconnect();
      shellRef.current?.kill();
      shellRef.current = null;
      xterm.dispose();
    };
  }, []);

  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-border bg-[#0d1117]", className)}>
      <div className="flex shrink-0 items-center gap-2 border-b border-border/40 px-3 py-2">
        <Terminal className="h-3.5 w-3.5 text-ink-soft" />
        <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Terminal</span>
      </div>
      <div ref={containerRef} className="min-h-0 flex-1 overflow-hidden p-1 [&_.xterm]:h-full" />
    </div>
  );
}
