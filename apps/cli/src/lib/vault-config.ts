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
    message?: string,
  ) {
    super(message ?? `Invalid CLI config: ${field} is invalid.`);
    this.name = "CliConfigValidationError";
    Object.setPrototypeOf(this, CliConfigValidationError.prototype);
  }
}

function toCliValidationError(error: VaultConfigValidationError): CliConfigValidationError {
  return new CliConfigValidationError(error.field, error.kind, error.message);
}

export function validateCliConfigEntry(entry: VaultConfig): ValidatedVaultConfig {
  try {
    return validateVaultConfig(entry);
  } catch (error) {
    if (error instanceof VaultConfigValidationError) {
      throw toCliValidationError(error);
    }

    throw error;
  }
}

export function loadValidatedCliConfigEntry<T>(
  entry: VaultConfig,
  onValid: (config: ValidatedVaultConfig) => T,
): T {
  return onValid(validateCliConfigEntry(entry));
}
