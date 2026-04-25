import type { VaultConfig } from "./types.js";

export const VAULT_CONFIG_VALIDATION_ERROR = "VAULT_CONFIG_VALIDATION_ERROR";

export type VaultConfigField = "address" | "token" | "namespace";

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
      `Invalid Vault config: ${field} is required and must be a non-empty string.`,
    );
  }

  return trimmed;
}

export function validateVaultConfig(config: VaultConfig): ValidatedVaultConfig {
  const address = requireNonEmptyString(config.address ?? config.endpoint, "address");
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
