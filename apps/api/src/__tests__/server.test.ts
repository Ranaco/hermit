import supertest from "supertest";
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock logger
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

// Mock error handling
jest.mock("@hermit/error-handling", () => ({
  errorHandler: (err: any, req: any, res: any, next: any) => res.status(500).json({ error: "Internal Server Error" }),
  notFoundHandler: (req: any, res: any) => res.status(404).json({ error: "Not Found" }),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) => Promise.resolve(fn(req, res, next)).catch(next),
}), { virtual: true });

// Mock prisma service
jest.mock("../services/prisma.service", () => ({
  checkDatabaseConnection: jest.fn(),
  getPrismaClient: jest.fn(),
  default: jest.fn(),
}));

// Mock encryption service
jest.mock("../services/encryption.service", () => ({
  checkHealth: jest.fn(),
  testConnection: jest.fn(),
}));

import { checkHealth as mockCheckHealth } from "../services/encryption.service";
import { checkDatabaseConnection as mockCheckDbConnection } from "../services/prisma.service";
import { createServer } from "../server";

const mockedCheckHealth = mockCheckHealth as jest.Mock;
const mockedCheckDbConnection = mockCheckDbConnection as jest.Mock;

describe("Server /health", () => {
  const app = createServer();

  beforeEach(() => {
    jest.clearAllMocks();
    // Default DB to connected for health checks unless specified
    mockedCheckDbConnection.mockResolvedValue(true);
  });

  it("returns 200 and healthy status when Vault is reachable", async () => {
    mockedCheckHealth.mockImplementation(async () => {
      // Simulate some network latency
      await new Promise<void>(resolve => setTimeout(resolve, 50));
      return { initialized: true };
    });

    const response = await supertest(app)
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      status: "healthy",
      vault_connected: true,
      environment: expect.any(String),
      version: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(typeof response.body.latency_ms).toBe("number");
    expect(response.body.latency_ms).toBeGreaterThanOrEqual(45); // Allow for small timer variance
  });

  it("returns 200 and degraded status when Vault is unreachable", async () => {
    mockedCheckHealth.mockRejectedValue(new Error("Vault connection refused"));

    const response = await supertest(app)
      .get("/health")
      .expect(200);

    expect(response.body).toMatchObject({
      status: "degraded",
      vault_connected: false,
      environment: expect.any(String),
      version: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(typeof response.body.latency_ms).toBe("number");
    expect(response.body.latency_ms).toBeGreaterThanOrEqual(0);
  });
});
