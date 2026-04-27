import test from "node:test";
import assert from "node:assert/strict";
import { parseSecretPathArg } from "../src/lib/secret-utils.ts";

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
