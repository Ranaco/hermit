import { URL } from "node:url";
import type { VaultConfig } from "./types.js";

export const VAULT_CONFIG_VALIDATION_ERROR = "VAULT_CONFIG_VALIDATION_ERROR";

export type VaultConfigField = "address" | "token" | "namespace";
export type VaultConfigValidationKind = "missing" | "invalid";

export interface ValidatedVaultConfig extends VaultConfig {
  address: string;
  endpoint: string;
  token: string;
  namespace: string;
}

export class VaultConfigValidationError extends Error {
  readonly code = VAULT_CONFIG_VALIDATION_ERROR;

  constructor(
    public readonly field: VaultConfigField,
    public readonly kind: VaultConfigValidationKind = "missing",
    message?: string,
  ) {
    super(message ?? `Invalid Vault config: ${field} is required.`);
    this.name = "VaultConfigValidationError";
    Object.setPrototypeOf(this, VaultConfigValidationError.prototype);
  }
}

function requireNonEmptyString(
  value: string | undefined,
  field: VaultConfigField,
): string {
  const trimmed = value?.trim();
  if (!trimmed) {
    throw new VaultConfigValidationError(
      field,
      "missing",
      `Invalid Vault config: ${field} is required and must be a non-empty string.`,
    );
  }

  return trimmed;
}

function requireAddress(config: VaultConfig): string {
  const address = requireNonEmptyString(config.address ?? config.endpoint, "address");

  try {
    const parsed = new URL(address);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new Error("unsupported protocol");
    }
  } catch {
    throw new VaultConfigValidationError(
      "address",
      "invalid",
      "Invalid Vault config: address must be a valid http or https URL.",
    );
  }

  return address;
}

export function validateVaultConfig(config: VaultConfig): ValidatedVaultConfig {
  const address = requireAddress(config);
  const token = requireNonEmptyString(config.token, "token");
  const namespace = requireNonEmptyString(config.namespace, "namespace");

  return {
    ...config,
    address,
    endpoint: address,
    token,
    namespace,
  };
}

export function assertValidVaultConfig(config: VaultConfig): asserts config is ValidatedVaultConfig {
  validateVaultConfig(config);
}
