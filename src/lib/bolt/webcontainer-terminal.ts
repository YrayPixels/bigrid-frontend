import type { WebContainerProcess } from "@webcontainer/api";
import { ensureDependenciesInstalled, getWebContainer } from "@/lib/bolt/webcontainer-runtime";
import { sanitizeTerminalOutput } from "@/lib/bolt/terminal-output";

export type TerminalAdapter = {
  readonly cols?: number;
  readonly rows?: number;
  write: (data: string) => void;
  onData: (cb: (data: string) => void) => void;
};

export type WebContainerShell = {
  process: WebContainerProcess;
  resize: (cols: number, rows: number) => void;
  kill: () => void;
};

export async function attachWebContainerShell(args: {
  terminal: TerminalAdapter;
  cwd?: string;
}): Promise<WebContainerShell> {
  const wc = await getWebContainer();

  const process = await wc.spawn("/bin/jsh", ["--osc"], {
    ...(args.cwd ? { cwd: args.cwd } : {}),
    terminal: {
      cols: args.terminal.cols ?? 80,
      rows: args.terminal.rows ?? 15,
    },
  });

  const input = process.input.getWriter();
  let isInteractive = false;

  const ready = new Promise<void>((resolve) => {
    process.output.pipeTo(
      new WritableStream({
        write(data) {
          if (!isInteractive) {
            // OSC sequence emitted by jsh when the shell is ready for input.
            // eslint-disable-next-line no-control-regex -- matching terminal escape sequences
            const [, osc] = data.match(/\x1b\]654;([^\x07]+)\x07/) || [];
            if (osc === "interactive") {
              isInteractive = true;
              resolve();
            }
          }
          args.terminal.write(data);
        },
      }),
    );
  });

  args.terminal.onData((data) => {
    if (isInteractive) {
      void input.write(data);
    }
  });

  await ready;

  return {
    process,
    resize(cols, rows) {
      process.resize({ cols, rows });
    },
    kill() {
      process.kill();
    },
  };
}

export async function runWebContainerCommand(args: {
  command: string;
  cwd?: string;
  onOutput?: (chunk: string) => void;
}) {
  const command = args.command.trim();
  if (/^(pnpm|npm)\s+install\b/.test(command)) {
    try {
      await ensureDependenciesInstalled({ onOutput: args.onOutput });
      return { exitCode: 0 };
    } catch {
      return { exitCode: 1 };
    }
  }

  const wc = await getWebContainer();

  const proc = await wc.spawn("sh", ["-lc", args.command], {
    ...(args.cwd ? { cwd: args.cwd } : {}),
  });

  proc.output.pipeTo(
    new WritableStream({
      write(chunk) {
        const cleaned = sanitizeTerminalOutput(String(chunk));
        if (cleaned) args.onOutput?.(cleaned);
      },
    }),
  );

  const exitCode = await proc.exit;
  return { exitCode };
}
