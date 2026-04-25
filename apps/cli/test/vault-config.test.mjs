import test from "node:test";
import assert from "node:assert/strict";

const {
  CLI_CONFIG_VALIDATION_ERROR,
  CliConfigValidationError,
  loadValidatedCliConfigEntry,
  validateCliConfigEntry,
} = await import("../dist/lib/vault-config.js");

test("validateCliConfigEntry accepts a complete config entry", () => {
  const config = validateCliConfigEntry({
    address: "https://vault.example.com",
    token: "vault-token",
    namespace: "admin",
  });

  assert.equal(config.address, "https://vault.example.com");
  assert.equal(config.endpoint, "https://vault.example.com");
  assert.equal(config.token, "vault-token");
  assert.equal(config.namespace, "admin");
});

for (const [field, entry] of [
  [
    "address",
    {
      token: "vault-token",
      namespace: "admin",
    },
  ],
  [
    "token",
    {
      address: "https://vault.example.com",
      namespace: "admin",
    },
  ],
  [
    "namespace",
    {
      address: "https://vault.example.com",
      token: "vault-token",
    },
  ],
]) {
  test(`validateCliConfigEntry returns a typed error when ${field} is missing`, () => {
    assert.throws(
      () => validateCliConfigEntry(entry),
      (error) => {
        assert.ok(error instanceof CliConfigValidationError);
        assert.equal(error.code, CLI_CONFIG_VALIDATION_ERROR);
        assert.equal(error.field, field);
        assert.equal(error.kind, "missing");
        assert.match(error.message, new RegExp(field, "i"));
        return true;
      },
    );
  });

  test(`loadValidatedCliConfigEntry aborts before any callback work when ${field} is missing`, () => {
    let invoked = false;

    assert.throws(
      () =>
        loadValidatedCliConfigEntry(entry, () => {
          invoked = true;
          return "should-not-run";
        }),
      (error) => {
        assert.ok(error instanceof CliConfigValidationError);
        assert.equal(error.field, field);
        return true;
      },
    );

    assert.equal(invoked, false);
  });
}
