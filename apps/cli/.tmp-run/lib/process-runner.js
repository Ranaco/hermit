import { spawn } from "node:child_process";
/**
 * Spawn a child process with injected environment variables.
 * Secrets are passed ONLY through spawn options, never written to disk.
 * Signals (SIGTERM, SIGINT, SIGHUP) are forwarded to the child.
 * Returns the child's exit code.
 */
export function runWithEnv(command, args, envVars) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, args, {
            stdio: "inherit",
            env: {
                ...process.env,
                ...envVars,
            },
            shell: true,
        });
        // Forward signals to child
        const forwardSignal = (signal) => {
            child.kill(signal);
        };
        process.on("SIGTERM", () => forwardSignal("SIGTERM"));
        process.on("SIGINT", () => forwardSignal("SIGINT"));
        process.on("SIGHUP", () => forwardSignal("SIGHUP"));
        child.on("error", (err) => {
            reject(err);
        });
        child.on("close", (code) => {
            // Clear secret env vars from our process after child exits
            for (const key of Object.keys(envVars)) {
                delete process.env[key];
            }
            // Clean up signal handlers
            process.removeAllListeners("SIGTERM");
            process.removeAllListeners("SIGINT");
            process.removeAllListeners("SIGHUP");
            resolve(code ?? 1);
        });
    });
}
