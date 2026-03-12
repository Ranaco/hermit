/**
 * Spawn a child process with injected environment variables.
 * Secrets are passed ONLY through spawn options, never written to disk.
 * Signals (SIGTERM, SIGINT, SIGHUP) are forwarded to the child.
 * Returns the child's exit code.
 */
export declare function runWithEnv(command: string, args: string[], envVars: Record<string, string>): Promise<number>;
//# sourceMappingURL=process-runner.d.ts.map