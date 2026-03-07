import {
  confirm as baseConfirm,
  editor as baseEditor,
  input as baseInput,
  password as basePassword,
  select as baseSelect,
} from "@inquirer/prompts";
import { isNonInteractive } from "./runtime.js";

function assertInteractive(message: string): void {
  if (isNonInteractive()) {
    throw new Error(message);
  }
}

export async function promptInput(
  opts: Parameters<typeof baseInput>[0],
  missingMessage: string,
): Promise<string> {
  assertInteractive(missingMessage);
  return baseInput(opts);
}

export async function promptPassword(
  opts: Parameters<typeof basePassword>[0],
  missingMessage: string,
): Promise<string> {
  assertInteractive(missingMessage);
  return basePassword(opts);
}

export async function promptSelect<T>(
  opts: Parameters<typeof baseSelect<T>>[0],
  missingMessage: string,
): Promise<T> {
  assertInteractive(missingMessage);
  return baseSelect(opts);
}

export async function promptConfirm(
  opts: Parameters<typeof baseConfirm>[0],
  missingMessage: string,
): Promise<boolean> {
  assertInteractive(missingMessage);
  return baseConfirm(opts);
}

export async function promptEditor(
  opts: Parameters<typeof baseEditor>[0],
  missingMessage: string,
): Promise<string> {
  assertInteractive(missingMessage);
  return baseEditor(opts);
}

