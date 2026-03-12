import { confirm as baseConfirm, editor as baseEditor, input as baseInput, password as basePassword, select as baseSelect, } from "@inquirer/prompts";
import { isNonInteractive } from "./runtime.js";
function assertInteractive(message) {
    if (isNonInteractive()) {
        throw new Error(message);
    }
}
export async function promptInput(opts, missingMessage) {
    assertInteractive(missingMessage);
    return baseInput(opts);
}
export async function promptPassword(opts, missingMessage) {
    assertInteractive(missingMessage);
    return basePassword(opts);
}
export async function promptSelect(opts, missingMessage) {
    assertInteractive(missingMessage);
    return baseSelect(opts);
}
export async function promptConfirm(opts, missingMessage) {
    assertInteractive(missingMessage);
    return baseConfirm(opts);
}
export async function promptEditor(opts, missingMessage) {
    assertInteractive(missingMessage);
    return baseEditor(opts);
}
