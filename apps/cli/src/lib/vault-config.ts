import {
  type VaultConfigField,
  type VaultConfigValidationKind,
  VaultConfigValidationError,
  validateVaultConfig,
  type ValidatedVaultConfig,
} from "../../../../packages/vault-client/src/config-validation";
import type { VaultConfig } from "../../../../packages/vault-client/src/types";

export const CLI_CONFIG_VALIDATION_ERROR = "CLI_CONFIG_VALIDATION_ERROR";

export class CliConfigValidationError extends Error {
  readonly code = CLI_CONFIG_VALIDATION_ERROR;

  constructor(
    public readonly field: VaultConfigField,
    public readonly kind: VaultConfigValidationKind,
    public readonly entryName?: string,
    message?: string,
  ) {
    super(message ?? `Invalid Vault config: ${field} is required and must be valid.`);
    this.name = "CliConfigValidationError";
    Object.setPrototypeOf(this, CliConfigValidationError.prototype);
  }
}

function toCliValidationError(
  error: VaultConfigValidationError,
  entryName?: string,
): CliConfigValidationError {
  const message = entryName
    ? `Invalid Vault config for entry "${entryName}": ${error.message.replace(/^Invalid Vault config:\s*/i, "")}`
    : error.message;

  return new CliConfigValidationError(error.field, error.kind, entryName, message);
}

export function validateCliConfigEntry(entry: VaultConfig, entryName?: string): ValidatedVaultConfig {
  try {
    return validateVaultConfig(entry);
  } catch (error) {
    if (error instanceof VaultConfigValidationError) {
      throw toCliValidationError(error, entryName);
    }

    throw error;
  }
}

export function loadValidatedCliConfigEntry<T>(
  entry: VaultConfig,
  onValid: (config: ValidatedVaultConfig) => T,
  entryName?: string,
): T {
  return onValid(validateCliConfigEntry(entry, entryName));
}
