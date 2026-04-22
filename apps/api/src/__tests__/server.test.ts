import { describe, it, expect, jest } from "@jest/globals";
import type { Request, Response } from "express";

jest.mock(
  "@hermit/logger",
  () => ({
    log: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    httpLogStream: {
      write: jest.fn(),
    },
  }),
  { virtual: true },
);

jest.mock(
  "@hermit/error-handling",
  () => ({
    asyncHandler: jest.fn((handler) => handler),
    errorHandler: jest.fn((_error, _req, res, _next) => res.status(500).json({ error: "error" })),
    notFoundHandler: jest.fn((_req, res) => res.status(404).json({ error: "not found" })),
  }),
  { virtual: true },
);

jest.mock("../services/encryption.service", () => ({
  checkHealth: jest.fn(),
}));

jest.mock("../services/prisma.service", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    $disconnect: jest.fn(),
  })),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

import { checkHealth as checkEncryptionHealth } from "../services/encryption.service";
import { createServer } from "../server";

function getHealthRouteHandler() {
  const app = createServer() as ReturnType<typeof createServer> & {
    _router: {
      stack: Array<{
        route?: {
          path: string;
          stack: Array<{ handle: (_req: Request, res: Response) => Promise<void> | void }>;
        };
      }>;
    };
  };

  const routeLayer = app._router.stack.find((layer) => layer.route?.path === "/health");

  if (!routeLayer?.route) {
    throw new Error("Health route not found");
  }

  return routeLayer.route.stack[0]?.handle;
}

async function invokeHealthRoute() {
  const handler = getHealthRouteHandler();
  const status = jest.fn().mockReturnThis();
  const json = jest.fn();
  const res = { status, json } as unknown as Response;

  await handler({} as Request, res);

  return { status, json };
}

describe("Server", () => {
  it("returns vault connectivity details when Vault is reachable", async () => {
    jest.mocked(checkEncryptionHealth).mockResolvedValueOnce({ initialized: true });

    const { status, json } = await invokeHealthRoute();

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      status: "healthy",
      vault_connected: true,
      latency_ms: expect.any(Number),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
    });
  });

  it("returns degraded health details when Vault is unreachable", async () => {
    jest.mocked(checkEncryptionHealth).mockRejectedValueOnce(new Error("vault down"));

    const { status, json } = await invokeHealthRoute();

    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith({
      status: "degraded",
      vault_connected: false,
      latency_ms: expect.any(Number),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
    });
  });
});
