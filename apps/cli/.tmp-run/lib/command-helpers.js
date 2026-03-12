import * as authStore from "./auth-store.js";
import * as ui from "./ui.js";
import { isJsonMode, isNonInteractive } from "./runtime.js";
export class CliAbortError extends Error {
    exitCode;
    suggestions;
    details;
    constructor(message, exitCode = 1, suggestions, details) {
        super(message);
        this.exitCode = exitCode;
        this.suggestions = suggestions;
        this.details = details;
        this.name = "CliAbortError";
    }
}
export function abort(message, opts = {}) {
    throw new CliAbortError(message, opts.exitCode, opts.suggestions, opts.details);
}
export function requireAuth() {
    if (!authStore.isAuthenticated()) {
        abort("Not logged in", { suggestions: ["Run: hermes auth login"], exitCode: 1 });
    }
}
export function requireInteractive(message) {
    if (isNonInteractive()) {
        abort(message, { exitCode: 2 });
    }
}
export function renderData(data) {
    if (isJsonMode()) {
        ui.printJson(data);
    }
}
export async function runCommand(handler) {
    try {
        return await handler();
    }
    catch (error) {
        if (error instanceof CliAbortError) {
            if (isJsonMode()) {
                ui.printJson({
                    success: false,
                    error: error.message,
                    details: error.details,
                });
            }
            else {
                ui.error(error.message, error.suggestions);
                ui.newline();
            }
            process.exit(error.exitCode);
        }
        const message = error instanceof Error ? error.message : "Unexpected CLI error";
        if (isJsonMode()) {
            ui.printJson({ success: false, error: message });
        }
        else {
            ui.error(message);
            ui.newline();
        }
        process.exit(1);
    }
}
