import test from "node:test";
import assert from "node:assert/strict";

const { runWithEnv } = await import("../dist/lib/process-runner.js");

// Spawn tests must run serially — concurrent child processes can resolve
// each other's promises via shared stdio, producing wrong exit codes.
await test("process-runner", { concurrency: 1 }, async (t) => {
  await t.test("spawns node --version and exits 0", async () => {
    const code = await runWithEnv("node", ["--version"], {});
    assert.equal(code, 0);
  });

  await t.test("injects env vars into child process", async () => {
    // HERMIT_INJECTED truthy → exits 0; absent/falsy → exits 1
    const code = await runWithEnv(
      "node",
      ["-e", "process.exit(process.env.HERMIT_INJECTED?0:1)"],
      { HERMIT_INJECTED: "yes" },
    );
    assert.equal(code, 0);
  });

  await t.test("non-zero exit code propagates", async () => {
    const code = await runWithEnv("node", ["-e", "process.exit(42)"], {});
    assert.equal(code, 42);
  });

  if (process.platform === "win32") {
    await t.test("runs bare command on Windows via shell without ENOENT", async () => {
      const code = await runWithEnv("cmd", ["/c", "echo", "hello"], {});
      assert.equal(code, 0);
    });
  }
});
