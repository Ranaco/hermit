let runtimeState = {
    outputMode: process.stdout.isTTY ? "interactive" : "plain",
    nonInteractive: !process.stdin.isTTY,
    colorEnabled: process.stdout.isTTY,
    serverUrlOverride: undefined,
};
export function setRuntimeState(nextState) {
    runtimeState = {
        ...runtimeState,
        ...nextState,
    };
}
export function getRuntimeState() {
    return runtimeState;
}
export function isJsonMode() {
    return runtimeState.outputMode === "json";
}
export function isInteractiveMode() {
    return runtimeState.outputMode === "interactive";
}
export function isNonInteractive() {
    return runtimeState.nonInteractive;
}
