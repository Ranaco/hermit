import test from "node:test";
import assert from "node:assert/strict";

// Mirroring the logic from src/lib/secret-utils.ts for verification
function parseSecretPathArg(arg) {
  const index = arg.lastIndexOf("/");
  return index === -1
    ? { path: undefined, name: arg }
    : { path: arg.slice(0, index), name: arg.slice(index + 1) };
}

test("parseSecretPathArg logic verification", () => {
  assert.deepEqual(parseSecretPathArg("DATABASE_URL"), {
    path: undefined,
    name: "DATABASE_URL",
  });

  assert.deepEqual(parseSecretPathArg("prod/api/DATABASE_URL"), {
    path: "prod/api",
    name: "DATABASE_URL",
  });

  assert.deepEqual(parseSecretPathArg("folder/secret"), {
    path: "folder",
    name: "secret",
  });

  assert.deepEqual(parseSecretPathArg("/secret"), {
    path: "",
    name: "secret",
  });
});
