import test from "node:test";
import assert from "node:assert/strict";

const {
  CLI_CONFIG_VALIDATION_ERROR,
  CliConfigValidationError,
  loadValidatedCliConfigEntry,
  validateCliConfigEntry,
} = await import("../dist/lib/vault-config.js");
const {
  loadValidatedCliConfigEntries,
  validateCliConfigEntries,
} = await import("../dist/lib/config.js");
const { runCommand } = await import("../dist/lib/command-helpers.js");
const ui = await import("../dist/lib/ui.js");

class ExitSignal extends Error {
  constructor(code) {
    super(`process.exit(${code})`);
    this.code = code;
  }
}

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

test("validateCliConfigEntries accepts a complete set of named config entries", () => {
  const configs = validateCliConfigEntries({
    default: {
      address: "https://vault.example.com",
      token: "vault-token",
      namespace: "admin",
    },
    production: {
      address: "https://vault-prod.example.com",
      token: "vault-token-prod",
      namespace: "ops",
    },
  });

  assert.equal(configs.default.endpoint, "https://vault.example.com");
  assert.equal(configs.production.endpoint, "https://vault-prod.example.com");
  assert.equal(configs.production.namespace, "ops");
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
        assert.equal(error.entryName, undefined);
        return true;
      },
    );
  });

  test(`validateCliConfigEntries returns a typed error with the config entry name when ${field} is missing`, () => {
    assert.throws(
      () =>
        validateCliConfigEntries({
          default: entry,
        }),
      (error) => {
        assert.ok(error instanceof CliConfigValidationError);
        assert.equal(error.code, CLI_CONFIG_VALIDATION_ERROR);
        assert.equal(error.field, field);
        assert.equal(error.kind, "missing");
        assert.equal(error.entryName, "default");
        assert.match(error.message, /default/i);
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

  test(`loadValidatedCliConfigEntries aborts before any callback work when ${field} is missing`, () => {
    let invoked = false;

    assert.throws(
      () =>
        loadValidatedCliConfigEntries(
          {
            default: entry,
          },
          () => {
            invoked = true;
            return "should-not-run";
          },
        ),
      (error) => {
        assert.ok(error instanceof CliConfigValidationError);
        assert.equal(error.field, field);
        assert.equal(error.entryName, "default");
        return true;
      },
    );

    assert.equal(invoked, false);
  });

  test(`runCommand renders a user-facing validation error when ${field} is missing`, async () => {
    const originalExit = process.exit;
    const originalError = console.error;
    const originalLog = console.log;
    const errorLines = [];

    ui.setRuntimeState({
      outputMode: "plain",
      colorEnabled: false,
      nonInteractive: true,
      quiet: false,
    });

    process.exit = ((code) => {
      throw new ExitSignal(code);
    });
    console.error = (...args) => {
      errorLines.push(args.join(" "));
    };
    console.log = () => {};

    try {
      await assert.rejects(
        () =>
          runCommand(async () => {
            loadValidatedCliConfigEntry(entry, () => "should-not-run");
          }),
        (error) => {
          assert.ok(error instanceof ExitSignal);
          assert.equal(error.code, 1);
          return true;
        },
      );
    } finally {
      process.exit = originalExit;
      console.error = originalError;
      console.log = originalLog;
    }

    assert(errorLines.some((line) => line.includes(field)));
    assert(errorLines.some((line) => line.includes("Invalid Vault config")));
  });
}
