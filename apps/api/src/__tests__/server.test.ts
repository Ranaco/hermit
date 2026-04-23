import { describe, expect, it, jest } from "@jest/globals";
import request from "supertest";
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
    asyncHandler: jest.fn((handler) => async (req, res, next) => {
      try {
        await handler(req, res, next);
      } catch (error) {
        next(error);
      }
    }),
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

describe("GET /health", () => {
  it("returns vault connectivity details when Vault is reachable", async () => {
    jest.mocked(checkEncryptionHealth).mockResolvedValueOnce({ initialized: true });
    const response = await request(createServer())
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      status: HEALTH_STATUS.HEALTHY,
      vault_connected: true,
      latency_ms: expect.any(Number),
      environment: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(Number.isInteger(response.body.latency_ms)).toBe(true);
    expect(Number.isFinite(response.body.uptime)).toBe(true);
    expect(new Date(response.body.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("returns degraded health details when Vault is unreachable", async () => {
    jest.mocked(checkEncryptionHealth).mockRejectedValueOnce(new Error("vault down"));
    const response = await request(createServer())
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      status: HEALTH_STATUS.DEGRADED,
      vault_connected: false,
      latency_ms: expect.any(Number),
      environment: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(Number.isInteger(response.body.latency_ms)).toBe(true);
    expect(Number.isFinite(response.body.uptime)).toBe(true);
    expect(new Date(response.body.timestamp).toString()).not.toBe("Invalid Date");
  });
});
