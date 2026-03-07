import * as authStore from "./auth-store.js";
import * as ui from "./ui.js";
import { isJsonMode, isNonInteractive } from "./runtime.js";

export class CliAbortError extends Error {
  constructor(
    message: string,
    public exitCode: number = 1,
    public suggestions?: string[],
    public details?: unknown,
  ) {
    super(message);
    this.name = "CliAbortError";
  }
}

export function abort(
  message: string,
  opts: { exitCode?: number; suggestions?: string[]; details?: unknown } = {},
): never {
  throw new CliAbortError(message, opts.exitCode, opts.suggestions, opts.details);
}

export function requireAuth(): void {
  if (!authStore.isAuthenticated()) {
    abort("Not logged in", { suggestions: ["Run: hermes auth login"], exitCode: 1 });
  }
}

export function requireInteractive(message: string): void {
  if (isNonInteractive()) {
    abort(message, { exitCode: 2 });
  }
}

export function renderData(data: unknown): void {
  if (isJsonMode()) {
    ui.printJson(data);
  }
}

export async function runCommand<T>(handler: () => Promise<T>): Promise<T | undefined> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof CliAbortError) {
      if (isJsonMode()) {
        ui.printJson({
          success: false,
          error: error.message,
          details: error.details,
        });
      } else {
        ui.error(error.message, error.suggestions);
        ui.newline();
      }
      process.exit(error.exitCode);
    }

    const message = error instanceof Error ? error.message : "Unexpected CLI error";
    if (isJsonMode()) {
      ui.printJson({ success: false, error: message });
    } else {
      ui.error(message);
      ui.newline();
    }
    process.exit(1);
  }
}
