import * as authStore from "./auth-store.js";
import * as ui from "./ui.js";
import { isJsonMode, isNonInteractive } from "./runtime.js";
import { CliConfigValidationError } from "./vault-config.js";

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
    abort("Not logged in", { suggestions: ["Run: hermit auth login"], exitCode: 1 });
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

export function exitWithUserFacingError(
  message: string,
  opts: { exitCode?: number; suggestions?: string[]; details?: unknown } = {},
): never {
  const exitCode = opts.exitCode ?? 1;

  if (isJsonMode()) {
    ui.printJson({
      success: false,
      error: message,
      details: opts.details,
    });
  } else {
    ui.error(message, opts.suggestions);
    ui.newline();
  }

  process.exit(exitCode);
}

export async function runCommand<T>(handler: () => Promise<T>): Promise<T | undefined> {
  try {
    return await handler();
  } catch (error) {
    if (error instanceof CliAbortError) {
      exitWithUserFacingError(error.message, {
        exitCode: error.exitCode,
        suggestions: error.suggestions,
        details: error.details,
      });
    }

    if (error instanceof CliConfigValidationError) {
      exitWithUserFacingError(error.message, {
        details: {
          code: error.code,
          field: error.field,
          kind: error.kind,
        },
      });
    }

    const message = error instanceof Error ? error.message : "Unexpected CLI error";
    exitWithUserFacingError(message);
  }
}
