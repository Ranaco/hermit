import test from "node:test";
import assert from "node:assert/strict";

import {
  assertValidVaultConfig,
  VaultConfigValidationError,
  validateVaultConfig,
} from "../src/config-validation.js";

test("validateVaultConfig accepts a complete config", () => {
  const config = validateVaultConfig({
    address: "https://vault.example.com",
    token: "vault-token",
    namespace: "admin",
  });

  assert.equal(config.address, "https://vault.example.com");
  assert.equal(config.token, "vault-token");
  assert.equal(config.namespace, "admin");
});

for (const [field, config] of [
  [
    "address",
    {
      address: "",
      token: "vault-token",
      namespace: "admin",
    },
  ],
  [
    "token",
    {
      address: "https://vault.example.com",
      token: "",
      namespace: "admin",
    },
  ],
  [
    "namespace",
    {
      address: "https://vault.example.com",
      token: "vault-token",
      namespace: "",
    },
  ],
] as const) {
  test(`validateVaultConfig rejects a missing ${field}`, () => {
    assert.throws(
      () => validateVaultConfig(config),
      (error: unknown) => {
        assert.ok(error instanceof VaultConfigValidationError);
        assert.equal(error.code, "VAULT_CONFIG_VALIDATION_ERROR");
        assert.equal(error.field, field);
        assert.match(error.message, new RegExp(field, "i"));
        return true;
      },
    );
  });

  test(`assertValidVaultConfig throws a typed error when ${field} is missing`, () => {
    assert.throws(
      () => assertValidVaultConfig(config),
      (error: unknown) => {
        assert.ok(error instanceof VaultConfigValidationError);
        assert.equal(error.field, field);
        return true;
      },
    );
  });
}
