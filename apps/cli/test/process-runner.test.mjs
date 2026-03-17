import test from "node:test";
import assert from "node:assert/strict";

const { runWithEnv } = await import("../dist/lib/process-runner.js");

test("spawns node --version and exits 0", async () => {
  const code = await runWithEnv("node", ["--version"], {});
  assert.equal(code, 0);
});

test("injects env vars into child process", async () => {
  // On Windows (shell:true) cmd.exe treats parentheses as syntax, so we avoid
  // process.exit() and spaces in the expression. process.exitCode=N exits cleanly.
  // HERMIT_EXIT=0 → node exits 0; absent → defaults to undefined → NaN → 0 via || 42
  const code = await runWithEnv(
    "node",
    ["-e", "process.exitCode=+process.env.HERMIT_EXIT||42"],
    { HERMIT_EXIT: "0" },
  );
  assert.equal(code, 0);
});

test("non-zero exit code propagates", async () => {
  const code = await runWithEnv("node", ["-e", "process.exit(42)"], {});
  assert.equal(code, 42);
});

if (process.platform === "win32") {
  test("runs bare command on Windows via shell without ENOENT", async () => {
    const code = await runWithEnv("cmd", ["/c", "echo", "hello"], {});
    assert.equal(code, 0);
  });
}
