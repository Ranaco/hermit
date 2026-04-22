import { describe, expect, it, jest } from "@jest/globals";
import type { Express, Request, Response } from "express";
import { HEALTH_STATUS } from "../constants/health";

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

interface MockResponse {
  status: jest.MockedFunction<(code: number) => MockResponse>;
  json: jest.MockedFunction<(payload: unknown) => MockResponse>;
}

function getHealthRouteHandler(app: Express) {
  const router = (app as Express & {
    _router?: {
      stack?: Array<{
        route?: {
          path: string;
          methods: Record<string, boolean>;
          stack: Array<{ handle: (req: Request, res: Response) => unknown }>;
        };
      }>;
    };
  })._router;

  const healthLayer = router?.stack?.find((layer) =>
    layer.route?.path === "/health" && layer.route.methods.get,
  );

  if (!healthLayer?.route) {
    throw new Error("GET /health route was not registered");
  }

  return healthLayer.route.stack[0]?.handle;
}

function createMockResponse(): MockResponse {
  const response = {} as MockResponse;
  response.status = jest.fn(() => response);
  response.json = jest.fn(() => response);
  return response;
}

describe("GET /health", () => {
  it("returns vault connectivity details when Vault is reachable", async () => {
    jest.mocked(checkEncryptionHealth).mockResolvedValueOnce({ initialized: true });
    const healthHandler = getHealthRouteHandler(createServer());
    const response = createMockResponse();

    await healthHandler({} as Request, response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: HEALTH_STATUS.HEALTHY,
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
      vault_connected: true,
      latency_ms: expect.any(Number),
    });
    const healthPayload = response.json.mock.calls[0]?.[0] as { latency_ms: number };
    expect(Number.isInteger(healthPayload.latency_ms)).toBe(true);
  });

  it("returns degraded health details when Vault is unreachable", async () => {
    jest.mocked(checkEncryptionHealth).mockRejectedValueOnce(new Error("vault down"));
    const healthHandler = getHealthRouteHandler(createServer());
    const response = createMockResponse();

    await healthHandler({} as Request, response as unknown as Response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: HEALTH_STATUS.DEGRADED,
      timestamp: expect.any(String),
      uptime: expect.any(Number),
      environment: expect.any(String),
      vault_connected: false,
      latency_ms: expect.any(Number),
    });
    const healthPayload = response.json.mock.calls[0]?.[0] as { latency_ms: number };
    expect(Number.isInteger(healthPayload.latency_ms)).toBe(true);
  });
});
