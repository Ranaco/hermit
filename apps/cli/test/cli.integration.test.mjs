import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { spawn } from "node:child_process";
import http from "node:http";

const cliEntry = path.resolve("dist/index.js");

function createServerState() {
  return {
    loginCount: 0,
    createdSecrets: [],
    lastLoginBody: null,
  };
}

function jsonResponse(response, statusCode, data) {
  response.writeHead(statusCode, { "content-type": "application/json" });
  response.end(JSON.stringify(data));
}

function collectBody(request) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")));
      } catch (error) {
        reject(error);
      }
    });
    request.on("error", reject);
  });
}

async function startFakeHermitServer() {
  const state = createServerState();

  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, "http://127.0.0.1");

    if (request.method === "POST" && url.pathname === "/api/v1/auth/login") {
      const body = await collectBody(request);
      state.loginCount += 1;
      state.lastLoginBody = body;

      if (body.clientType !== "CLI" || !body.cliPublicKey || !body.hardwareFingerprint) {
        jsonResponse(response, 400, {
          success: false,
          error: { message: "Missing CLI device registration fields" },
        });
        return;
      }

      jsonResponse(response, 200, {
        success: true,
        data: {
          user: {
            id: "user-1",
            email: body.email,
            username: "runner",
            firstName: "Hermit",
            lastName: "Runner",
            isTwoFactorEnabled: false,
          },
          organization: { id: "org-1", name: "Acme Org" },
          tokens: { accessToken: "access-token", refreshToken: "refresh-token" },
          device: { id: "device-1", isTrusted: true, clientType: "CLI" },
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/auth/logout") {
      jsonResponse(response, 200, { success: true, data: { success: true } });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/organizations") {
      jsonResponse(response, 200, {
        success: true,
        data: {
          organizations: [{ id: "org-1", name: "Acme Org", slug: "acme" }],
        },
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/vaults") {
      jsonResponse(response, 200, {
        success: true,
        data: {
          vaults: [{ id: "vault-1", name: "app-vault", organizationId: "org-1", _count: { keys: 1 } }],
        },
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/secrets") {
      const search = url.searchParams.get("search");
      const secrets =
        !search || search.toLowerCase() === "database_url"
          ? [
              {
                id: "secret-1",
                name: "DATABASE_URL",
                valueType: "STRING",
                updatedAt: "2026-03-01T00:00:00.000Z",
                currentVersion: { versionNumber: 1, createdAt: "2026-03-01T00:00:00.000Z" },
              },
            ]
          : [];
      jsonResponse(response, 200, {
        success: true,
        data: { secrets },
      });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/v1/keys") {
      jsonResponse(response, 200, {
        success: true,
        data: {
          keys: [{ id: "key-1", name: "default-key", vaultId: "vault-1", valueType: "STRING", createdAt: "2026-03-01T00:00:00.000Z" }],
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/secrets/secret-1/cli-reveal") {
      jsonResponse(response, 200, {
        success: true,
        data: {
          secret: {
            id: "secret-1",
            name: "DATABASE_URL",
            value: "postgres://db.example/hermit",
            versionNumber: 3,
            updatedAt: "2026-03-02T00:00:00.000Z",
          },
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/secrets/cli/bulk-reveal") {
      jsonResponse(response, 200, {
        success: true,
        data: {
          secrets: [
            { name: "DATABASE_URL", value: "postgres://db.example/hermit", valueType: "STRING" },
            { name: "APP_CONFIG", value: "API_KEY=abc123\nTIMEOUT=30", valueType: "MULTILINE" },
          ],
          skipped: [],
          count: 2,
        },
      });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/v1/secrets") {
      const body = await collectBody(request);
      state.createdSecrets.push(body);
      jsonResponse(response, 200, {
        success: true,
        data: {
          secret: {
            id: `created-${state.createdSecrets.length}`,
            name: body.name,
            valueType: body.valueType,
            updatedAt: "2026-03-03T00:00:00.000Z",
          },
        },
      });
      return;
    }

    jsonResponse(response, 404, {
      success: false,
      error: { message: `Unhandled route: ${request.method} ${url.pathname}` },
    });
  });

  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const baseUrl = `http://127.0.0.1:${address.port}/api/v1`;

  return {
    server,
    baseUrl,
    state,
    async close() {
      await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
    },
  };
}

function runCli(args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliEntry, ...args], {
      cwd: path.resolve("."),
      env: {
        ...process.env,
        ...options.env,
      },
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    const stdout = [];
    const stderr = [];

    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({
        code,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
      });
    });

    if (options.stdin) {
      child.stdin.write(options.stdin);
    }
    child.stdin.end();
  });
}

async function findFiles(rootDir, targetName) {
  const matches = [];

  async function walk(currentDir) {
    const entries = await fs.readdir(currentDir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }
      if (entry.name === targetName) {
        matches.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return matches;
}

await test("cli integration", { concurrency: 1 }, async (t) => {
  const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hermit-cli-test-"));
  const fakeServer = await startFakeHermitServer();

  const baseEnv = {
    APPDATA: tempRoot,
    LOCALAPPDATA: tempRoot,
    USERPROFILE: tempRoot,
    HOME: tempRoot,
    FORCE_COLOR: "0",
  };

  await t.test("shorthand login uses the CLI device-aware auth flow", async () => {
    const result = await runCli(
      ["login", "-s", fakeServer.baseUrl, "-e", "user@example.com", "-p", "secret", "--json"],
      { env: baseEnv },
    );

    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.success, true);
    assert.equal(payload.user.email, "user@example.com");
    assert.equal(fakeServer.state.lastLoginBody.clientType, "CLI");
    assert.ok(fakeServer.state.lastLoginBody.cliPublicKey);
    assert.ok(fakeServer.state.lastLoginBody.hardwareFingerprint);

    const keyFiles = await findFiles(tempRoot, "store-key");
    assert.equal(keyFiles.length, 1);
  });

  await t.test("version output does not depend on a readable auth store", async () => {
    const isolatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hermit-cli-version-test-"));
    const isolatedEnv = {
      ...baseEnv,
      APPDATA: isolatedRoot,
      LOCALAPPDATA: isolatedRoot,
      USERPROFILE: isolatedRoot,
      HOME: isolatedRoot,
    };

    const bootstrapResult = await runCli(
      ["login", "-s", fakeServer.baseUrl, "-e", "bootstrap@example.com", "-p", "secret", "--json"],
      { env: isolatedEnv },
    );
    assert.equal(bootstrapResult.code, 0, bootstrapResult.stderr);

    const resolvedConfigFiles = await findFiles(isolatedRoot, "config.json");
    assert.equal(resolvedConfigFiles.length >= 1, true);
    await fs.writeFile(resolvedConfigFiles[0], "not-json-and-not-decryptable", "utf8");

    const result = await runCli(["--version"], { env: isolatedEnv });
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /\d+\.\d+\.\d+/);

    await fs.rm(isolatedRoot, { recursive: true, force: true });
  });

  await t.test("default invocation does not depend on a readable auth store", async () => {
    const isolatedRoot = await fs.mkdtemp(path.join(os.tmpdir(), "hermit-cli-default-test-"));
    const isolatedEnv = {
      ...baseEnv,
      APPDATA: isolatedRoot,
      LOCALAPPDATA: isolatedRoot,
      USERPROFILE: isolatedRoot,
      HOME: isolatedRoot,
    };

    const bootstrapResult = await runCli(
      ["login", "-s", fakeServer.baseUrl, "-e", "bootstrap2@example.com", "-p", "secret", "--json"],
      { env: isolatedEnv },
    );
    assert.equal(bootstrapResult.code, 0, bootstrapResult.stderr);

    const resolvedConfigFiles = await findFiles(isolatedRoot, "config.json");
    assert.equal(resolvedConfigFiles.length >= 1, true);
    await fs.writeFile(resolvedConfigFiles[0], "not-json-and-not-decryptable", "utf8");

    const result = await runCli([], { env: isolatedEnv });
    assert.equal([0, 1].includes(result.code), true, result.stderr);
    assert.match(result.stdout || result.stderr, /Usage: hermit/i);
    assert.doesNotMatch(`${result.stdout}\n${result.stderr}`, /SyntaxError: Unexpected token/i);

    await fs.rm(isolatedRoot, { recursive: true, force: true });
  });

  await t.test("nested auth login also succeeds and persists authenticated status", async () => {
    const loginResult = await runCli(
      ["auth", "login", "-s", fakeServer.baseUrl, "-e", "user2@example.com", "-p", "secret", "--json"],
      { env: baseEnv },
    );
    assert.equal(loginResult.code, 0, loginResult.stderr);

    const statusResult = await runCli(["auth", "status", "--json"], { env: baseEnv });
    assert.equal(statusResult.code, 0, statusResult.stderr);
    const statusPayload = JSON.parse(statusResult.stdout);
    assert.equal(statusPayload.authenticated, true);
    assert.equal(statusPayload.user.email, "user2@example.com");
    assert.equal(statusPayload.organization.name, "Acme Org");
  });

  await t.test("secret get prints the raw value to stdout in non-tty mode", async () => {
    const result = await runCli(["get", "DATABASE_URL", "--vault", "app-vault"], { env: baseEnv });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(result.stdout, "postgres://db.example/hermit");
  });

  await t.test("env export emits mapped environment variables as JSON", async () => {
    const result = await runCli(["env", "--vault", "app-vault", "--format", "json"], { env: baseEnv });
    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.deepEqual(payload, {
      DATABASE_URL: "postgres://db.example/hermit",
      API_KEY: "abc123",
      TIMEOUT: "30",
    });
  });

  await t.test("secret import creates secrets from dotenv input", async () => {
    const importFile = path.join(tempRoot, "import.env");
    await fs.writeFile(importFile, "FIRST_KEY=one\nSECOND_KEY=two\n", "utf8");

    const result = await runCli(
      ["secret", "import", importFile, "--vault", "app-vault", "--yes", "--json"],
      { env: baseEnv },
    );
    assert.equal(result.code, 0, result.stderr);
    const payload = JSON.parse(result.stdout);
    assert.equal(payload.success, true);
    assert.equal(payload.created, 2);
    assert.equal(fakeServer.state.createdSecrets.length, 2);
    assert.equal(fakeServer.state.createdSecrets[0].name, "FIRST_KEY");
    assert.equal(fakeServer.state.createdSecrets[1].name, "SECOND_KEY");
  });

  await t.test("logout clears the persisted session", async () => {
    const logoutResult = await runCli(["logout", "--json"], { env: baseEnv });
    assert.equal(logoutResult.code, 0, logoutResult.stderr);

    const statusResult = await runCli(["auth", "status", "--json"], { env: baseEnv });
    assert.equal(statusResult.code, 0, statusResult.stderr);
    const statusPayload = JSON.parse(statusResult.stdout);
    assert.equal(statusPayload.authenticated, false);
  });

  await fakeServer.close();
  await fs.rm(tempRoot, { recursive: true, force: true });
});
