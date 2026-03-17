import { constants } from "node:os";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";

function resolveCommand(command: string): string {
  if (process.platform !== "win32") {
    return command;
  }

  if (/[\\/]/.test(command) || /\.[a-z0-9]+$/i.test(command)) {
    return command;
  }

  const result = spawnSync("where.exe", [command], {
    encoding: "utf8",
    windowsHide: true,
  });

  if (result.status !== 0 || !result.stdout) {
    return command;
  }

  const matches = result.stdout
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return matches[0] || command;
}

/**
 * Spawn a child process with injected environment variables.
 * Secrets are passed ONLY through spawn options, never written to disk.
 * Signals (SIGTERM, SIGINT, SIGHUP) are forwarded to the child.
 * Returns the child's exit code.
 */
export function runWithEnv(
  command: string,
  args: string[],
  envVars: Record<string, string>
): Promise<number> {
  return new Promise((resolve, reject) => {
    // On Windows we use shell:true so cmd.exe handles PATH resolution —
    // passing a resolved full path (e.g. "C:\Program Files\nodejs\npm.cmd")
    // with spaces breaks cmd.exe. Pass the bare command name instead.
    const resolvedCommand = process.platform === "win32" ? command : resolveCommand(command);
    const child: ChildProcess = spawn(resolvedCommand, args, {
      stdio: "inherit",
      env: {
        ...process.env,
        ...envVars,
      },
      shell: process.platform === "win32",
      windowsHide: true,
    });

    const cleanupSignalHandlers = new Map<NodeJS.Signals, () => void>();
    const registeredSignals: NodeJS.Signals[] = ["SIGTERM", "SIGINT", "SIGHUP"];
    const removeSignalHandlers = () => {
      for (const [signal, handler] of cleanupSignalHandlers) {
        process.removeListener(signal, handler);
      }
      cleanupSignalHandlers.clear();
    };

    for (const signal of registeredSignals) {
      const handler = () => {
        if (!child.killed) {
          child.kill(signal);
        }
      };
      cleanupSignalHandlers.set(signal, handler);
      process.on(signal, handler);
    }

    child.on("error", (err) => {
      removeSignalHandlers();
      reject(err);
    });

    child.on("close", (code, signal) => {
      removeSignalHandlers();
      if (signal) {
        resolve(128 + (constants.signals[signal] ?? 1));
        return;
      }
      resolve(code ?? 1);
    });
  });
}
