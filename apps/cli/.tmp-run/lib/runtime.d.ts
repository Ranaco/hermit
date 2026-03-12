export type OutputMode = "interactive" | "plain" | "json";
export interface CliRuntimeState {
    outputMode: OutputMode;
    nonInteractive: boolean;
    colorEnabled: boolean;
    serverUrlOverride?: string;
}
export declare function setRuntimeState(nextState: Partial<CliRuntimeState>): void;
export declare function getRuntimeState(): CliRuntimeState;
export declare function isJsonMode(): boolean;
export declare function isInteractiveMode(): boolean;
export declare function isNonInteractive(): boolean;
//# sourceMappingURL=runtime.d.ts.map