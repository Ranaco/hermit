import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { requireActiveVault, resolveGroup, resolveGroupByPath, resolveVault } from "./context.js";
import { abort } from "./command-helpers.js";
import { promptSelect } from "./prompts.js";
import { findSecretCandidates } from "./resource-resolver.js";
import * as sdk from "./sdk.js";

export const valueTypes = ["STRING", "JSON", "NUMBER", "BOOLEAN", "MULTILINE"] as const;

export type ValueType = (typeof valueTypes)[number];

export interface ListSecretsParams {
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  search?: string;
}

export interface SetSecretParams {
  name?: string;
  value?: string;
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  keyId?: string;
  type?: ValueType;
  description?: string;
  password?: boolean;
  file?: string;
}

export interface GetSecretParams {
  query?: string;
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  password?: string;
  vaultPassword?: string;
  copy?: boolean;
}

export interface DeleteSecretParams {
  query?: string;
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
  yes?: boolean;
}

export interface RevealApiError {
  statusCode?: number;
  details?: {
    error?: {
      code?: string;
      message?: string;
    };
  };
}

export function parseSecretPathArg(arg: string): { path: string | undefined; name: string } {
  const index = arg.lastIndexOf("/");
  return index === -1
    ? { path: undefined, name: arg }
    : { path: arg.slice(0, index), name: arg.slice(index + 1) };
}

function trimSingleTrailingNewline(value: string): string {
  if (value.endsWith("\r\n")) {
    return value.slice(0, -2);
  }
  if (value.endsWith("\n")) {
    return value.slice(0, -1);
  }
  return value;
}

export async function readSecretStdinValue(): Promise<string | undefined> {
  if (process.stdin.isTTY) {
    return undefined;
  }

  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return trimSingleTrailingNewline(Buffer.concat(chunks).toString("utf-8"));
}

export function detectSecretValueType(value: string): ValueType {
  return value.includes("\n") ? "MULTILINE" : "STRING";
}

export function readSecretFileValue(filePath: string): string {
  try {
    return readFileSync(resolve(filePath), "utf-8");
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    abort(`Failed to read file "${filePath}": ${message}`);
  }
}

export async function resolveSecretKeyId(vaultId: string, requestedKeyId?: string): Promise<string> {
  if (requestedKeyId) return requestedKeyId;

  const keys = await sdk.getKeys(vaultId);
  if (keys.length === 0) {
    const key = await sdk.createKey({ name: "default-key", vaultId, valueType: "STRING" });
    return key.id;
  }
  if (keys.length === 1) {
    return keys[0].id;
  }

  return promptSelect(
    {
      message: "Select encryption key:",
      choices: keys.map((key) => ({ name: key.name, value: key.id })),
    },
    "Key id is required in non-interactive mode when multiple keys exist.",
  );
}

export async function resolveSecretScope(params: {
  vaultQuery?: string;
  groupQuery?: string;
  pathQuery?: string;
}): Promise<{
  vault: sdk.VaultSummary;
  group: sdk.SecretGroupSummary | undefined;
}> {
  const vault = params.vaultQuery ? await resolveVault(params.vaultQuery) : await requireActiveVault();
  const group = params.pathQuery
    ? await resolveGroupByPath(vault.id, params.pathQuery)
    : await resolveGroup(vault.id, params.groupQuery);

  return { vault, group };
}

export async function findSecretsForQuery(
  vaultId: string,
  groupId: string | undefined,
  query: string | undefined,
): Promise<sdk.SecretSummary[]> {
  return findSecretCandidates(vaultId, groupId, query);
}
