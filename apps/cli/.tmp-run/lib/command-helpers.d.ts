export declare class CliAbortError extends Error {
    exitCode: number;
    suggestions?: string[] | undefined;
    details?: unknown | undefined;
    constructor(message: string, exitCode?: number, suggestions?: string[] | undefined, details?: unknown | undefined);
}
export declare function abort(message: string, opts?: {
    exitCode?: number;
    suggestions?: string[];
    details?: unknown;
}): never;
export declare function requireAuth(): void;
export declare function requireInteractive(message: string): void;
export declare function renderData(data: unknown): void;
export declare function runCommand<T>(handler: () => Promise<T>): Promise<T | undefined>;
//# sourceMappingURL=command-helpers.d.ts.map