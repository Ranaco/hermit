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

test("validateVaultConfig rejects an invalid address", () => {
  assert.throws(
    () =>
      validateVaultConfig({
        address: "vault.example.com",
        token: "vault-token",
        namespace: "admin",
      }),
    (error: unknown) => {
      assert.ok(error instanceof VaultConfigValidationError);
      assert.equal(error.code, "VAULT_CONFIG_VALIDATION_ERROR");
      assert.equal(error.field, "address");
      assert.equal(error.kind, "invalid");
      assert.match(error.message, /valid http or https url/i);
      return true;
    },
  );
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
        assert.equal(error.kind, "missing");
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
        assert.equal(error.kind, "missing");
        return true;
      },
    );
  });
}
