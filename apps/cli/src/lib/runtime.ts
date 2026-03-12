export type OutputMode = "interactive" | "plain" | "json";

export interface CliRuntimeState {
  outputMode: OutputMode;
  nonInteractive: boolean;
  colorEnabled: boolean;
  serverUrlOverride?: string;
}

let runtimeState: CliRuntimeState = {
  outputMode: process.stdout.isTTY ? "interactive" : "plain",
  nonInteractive: !process.stdin.isTTY,
  colorEnabled: process.stdout.isTTY,
  serverUrlOverride: undefined,
};

export function setRuntimeState(nextState: Partial<CliRuntimeState>): void {
  runtimeState = {
    ...runtimeState,
    ...nextState,
  };
}

export function getRuntimeState(): CliRuntimeState {
  return runtimeState;
}

export function isJsonMode(): boolean {
  return runtimeState.outputMode === "json";
}

export function isInteractiveMode(): boolean {
  return runtimeState.outputMode === "interactive";
}

export function isNonInteractive(): boolean {
  return runtimeState.nonInteractive;
}
