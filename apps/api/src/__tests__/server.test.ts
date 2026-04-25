import express from "express";
import request from "supertest";
import { beforeEach, describe, it, expect, jest } from "@jest/globals";

const mockCheckHealth: jest.MockedFunction<
  () => Promise<{ initialized: boolean; sealed: boolean }>
> = jest.fn();
const mockCheckDatabaseConnection: jest.MockedFunction<
  () => Promise<boolean>
> = jest.fn();

jest.mock("@hermit/logger", () => ({
  log: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  httpLogStream: {
    write: jest.fn(),
  },
}), { virtual: true });

jest.mock("@hermit/error-handling", () => ({
  errorHandler: (
    err: unknown,
    _req: unknown,
    res: { status: (code: number) => { json: (body: unknown) => void } },
    _next: unknown,
  ) => res.status(500).json({ error: err }),
  notFoundHandler: (
    _req: unknown,
    res: { status: (code: number) => { json: (body: unknown) => void } },
  ) => res.status(404).json({ error: "Not Found" }),
}), { virtual: true });

const createEmptyRouter = () => express.Router();

jest.mock("../routes/auth.routes", () => createEmptyRouter());
jest.mock("../routes/user.routes", () => createEmptyRouter());
jest.mock("../routes/organization.routes", () => createEmptyRouter());
jest.mock("../routes/vault.routes", () => createEmptyRouter());
jest.mock("../routes/key.routes", () => createEmptyRouter());
jest.mock("../routes/secret.routes", () => createEmptyRouter());
jest.mock("../routes/group.routes", () => createEmptyRouter());
jest.mock("../routes/onboarding.routes", () => createEmptyRouter());
jest.mock("../routes/audit.routes", () => createEmptyRouter());
jest.mock("../routes/share.routes", () => createEmptyRouter());

jest.mock("../services/encryption.service", () => ({
  __esModule: true,
  checkHealth: (...args: unknown[]) => mockCheckHealth(...args),
  default: {
    checkHealth: (...args: unknown[]) => mockCheckHealth(...args),
  },
}));

jest.mock("../services/prisma.service", () => ({
  __esModule: true,
  default: jest.fn(),
  checkDatabaseConnection: (...args: unknown[]) =>
    mockCheckDatabaseConnection(...args),
}));

import {
  createServer,
  getHealthResponse,
  getReadinessResponse,
} from "../server";

describe("Server", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCheckHealth.mockResolvedValue({
      initialized: true,
      sealed: false,
    });
    mockCheckDatabaseConnection.mockResolvedValue(true);
  });

  it("registers GET /health and GET /readyz routes", () => {
    const app = createServer();
    const routePaths = ((app as express.Express & {
      _router?: { stack?: Array<{ route?: { path?: string } }> };
    })._router?.stack || [])
      .flatMap((layer: { route?: { path?: string } }) =>
        layer.route?.path ? [layer.route.path] : [],
      );

    expect(routePaths).toContain("/health");
    expect(routePaths).toContain("/readyz");
  });

  it("GET /health returns vault connectivity and latency when Vault is healthy", async () => {
    const response = await getHealthResponse();

    expect(response).toEqual({
      status: "ok",
      vault_connected: true,
      latency_ms: expect.any(Number),
    });
    expect(response.latency_ms).toBeGreaterThanOrEqual(0);
  });

  it("GET /health returns an error payload with HTTP 200 when Vault is unreachable", async () => {
    mockCheckHealth.mockRejectedValue(new Error("ECONNREFUSED"));

    await expect(getHealthResponse()).resolves.toEqual({
      status: "error",
      vault_connected: false,
      latency_ms: 0,
    });
  });

  it("GET /readyz returns 200 when the service dependencies are ready", async () => {
    await expect(getReadinessResponse()).resolves.toEqual({
      httpStatus: 200,
      body: { status: "ready" },
    });
  });

  it("GET /readyz returns 503 when a startup dependency is unavailable", async () => {
    mockCheckDatabaseConnection.mockResolvedValue(false);

    await expect(getReadinessResponse()).resolves.toEqual({
      httpStatus: 503,
      body: { status: "not_ready" },
    });
  });

  it("rejects /health without mTLS", async () => {
    const app = createServer();

    const response = await request(app).get("/health");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "mTLS client certificate required",
    });
  });

  it("GET /health returns 200 with the expected payload when mTLS succeeds", async () => {
    const app = createServer();

    const response = await request(app)
      .get("/health")
      .set("x-ssl-client-verify", "SUCCESS");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      vault_connected: true,
      latency_ms: expect.any(Number),
    });
  });

  it("rejects /readyz without mTLS", async () => {
    const app = createServer();

    const response = await request(app).get("/readyz");

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: "mTLS client certificate required",
    });
  });

  it("GET /readyz returns 503 with mTLS when a dependency is unavailable", async () => {
    mockCheckDatabaseConnection.mockResolvedValue(false);
    const app = createServer();

    const response = await request(app)
      .get("/readyz")
      .set("x-ssl-client-verify", "SUCCESS");

    expect(response.status).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
  });
});
