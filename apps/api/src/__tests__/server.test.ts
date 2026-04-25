import express from "express";
import { beforeEach, describe, it, expect, jest } from "@jest/globals";
import type { NextFunction, Request, Response } from "express";

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
  checkHealth: () => mockCheckHealth(),
  default: {
    checkHealth: () => mockCheckHealth(),
  },
}));

jest.mock("../services/prisma.service", () => ({
  __esModule: true,
  default: jest.fn(),
  checkDatabaseConnection: () => mockCheckDatabaseConnection(),
}));

import {
  createServer,
  getHealthResponse,
  getReadinessResponse,
} from "../server";

type RouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction,
) => void | Promise<void>;

interface MockRequestOptions {
  headers?: Record<string, string>;
  ips?: string[];
  ip?: string;
  socketAuthorized?: boolean;
  remoteAddress?: string;
}

interface MockResponse {
  statusCode: number;
  body: unknown;
}

function getRouteHandlers(app: express.Express, path: string): RouteHandler[] {
  const router = app as express.Express & {
    _router?: {
      stack?: Array<{
        route?: {
          path?: string;
          stack?: Array<{ handle: RouteHandler }>;
        };
      }>;
    };
  };

  const route = router._router?.stack?.find(
    (layer: { route?: { path?: string } }) => layer.route?.path === path,
  )?.route;
  if (!route?.stack) {
    throw new Error(`Route ${path} not found`);
  }

  return route.stack.map((layer: { handle: RouteHandler }) => layer.handle);
}

async function invokeRoute(
  app: express.Express,
  path: string,
  reqOptions: MockRequestOptions = {},
): Promise<MockResponse> {
  const headers = Object.fromEntries(
    Object.entries(reqOptions.headers ?? {}).map(([key, value]) => [key.toLowerCase(), value]),
  );
  const response: MockResponse = {
    statusCode: 200,
    body: undefined,
  };

  const req = {
    headers,
    header(name: string) {
      return headers[name.toLowerCase()];
    },
    ips: reqOptions.ips ?? [],
    ip: reqOptions.ip ?? reqOptions.remoteAddress ?? "127.0.0.1",
    path,
    socket: {
      authorized: reqOptions.socketAuthorized ?? false,
      remoteAddress: reqOptions.remoteAddress ?? "127.0.0.1",
    },
  } as unknown as Request;

  const res = {
    status(code: number) {
      response.statusCode = code;
      return this;
    },
    json(body: unknown) {
      response.body = body;
      return this;
    },
  } as unknown as Response;

  const handlers = getRouteHandlers(app, path);
  const runHandler = async (index: number): Promise<void> => {
    const handler = handlers[index];
    if (!handler) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      let nextCalled = false;

      const next: NextFunction = (error?: unknown) => {
        nextCalled = true;

        if (error) {
          reject(error);
          return;
        }

        void runHandler(index + 1).then(resolve).catch(reject);
      };

      Promise.resolve(handler(req, res, next))
        .then(() => {
          if (!nextCalled) {
            resolve();
          }
        })
        .catch(reject);
    });
  };

  await runHandler(0);

  return response;
}

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
    const response = await invokeRoute(app, "/health");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      error: "mTLS client certificate required",
    });
  });

  it("rejects /health when the proxy verification header is sent without a trusted proxy hop", async () => {
    const app = createServer();
    const response = await invokeRoute(app, "/health", {
      headers: {
        "x-ssl-client-verify": "SUCCESS",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      error: "mTLS client certificate required",
    });
  });

  it("GET /health returns 200 with the expected payload when mTLS succeeds", async () => {
    const app = createServer();
    const response = await invokeRoute(app, "/health", {
      headers: {
        "x-forwarded-for": "198.51.100.10",
        "x-ssl-client-verify": "SUCCESS",
      },
      ips: ["198.51.100.10"],
      ip: "198.51.100.10",
      remoteAddress: "172.18.0.5",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      status: "ok",
      vault_connected: true,
      latency_ms: expect.any(Number),
    });
  });

  it("rejects /readyz without mTLS", async () => {
    const app = createServer();
    const response = await invokeRoute(app, "/readyz");

    expect(response.statusCode).toBe(401);
    expect(response.body).toEqual({
      error: "mTLS client certificate required",
    });
  });

  it("GET /readyz returns 200 with mTLS when the service is ready", async () => {
    const app = createServer();
    const response = await invokeRoute(app, "/readyz", {
      headers: {
        "x-forwarded-for": "198.51.100.10",
        "x-ssl-client-verify": "SUCCESS",
      },
      ips: ["198.51.100.10"],
      ip: "198.51.100.10",
      remoteAddress: "172.18.0.5",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({ status: "ready" });
  });

  it("GET /readyz returns 503 with mTLS when a dependency is unavailable", async () => {
    mockCheckDatabaseConnection.mockResolvedValue(false);
    const app = createServer();
    const response = await invokeRoute(app, "/readyz", {
      headers: {
        "x-forwarded-for": "198.51.100.10",
        "x-ssl-client-verify": "SUCCESS",
      },
      ips: ["198.51.100.10"],
      ip: "198.51.100.10",
      remoteAddress: "172.18.0.5",
    });

    expect(response.statusCode).toBe(503);
    expect(response.body).toEqual({ status: "not_ready" });
  });
});
