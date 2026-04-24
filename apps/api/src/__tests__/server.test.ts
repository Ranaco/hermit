import { describe, expect, it, jest } from "@jest/globals";
import express from "express";
import request from "supertest";

const mockedCheckHealth = jest.fn();
const mockRouterModule = {
  __esModule: true,
  default: express.Router(),
};

jest.mock("../services/encryption.service", () => ({
  checkHealth: mockedCheckHealth,
}));

jest.mock("../middleware/security", () => ({
  setupHelmet: jest.fn(),
  setupCors: jest.fn(),
  generalRateLimiter: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock("../middleware/context", () => ({
  requestContext: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
  logRequestCompletion: (_req: express.Request, _res: express.Response, next: express.NextFunction) => next(),
}));

jest.mock("../services/prisma.service", () => ({
  __esModule: true,
  default: jest.fn(() => ({
    $disconnect: jest.fn(),
  })),
  checkDatabaseConnection: jest.fn().mockResolvedValue(true),
}));

jest.mock("../routes/auth.routes", () => mockRouterModule);
jest.mock("../routes/user.routes", () => mockRouterModule);
jest.mock("../routes/organization.routes", () => mockRouterModule);
jest.mock("../routes/vault.routes", () => mockRouterModule);
jest.mock("../routes/key.routes", () => mockRouterModule);
jest.mock("../routes/secret.routes", () => mockRouterModule);
jest.mock("../routes/group.routes", () => mockRouterModule);
jest.mock("../routes/onboarding.routes", () => mockRouterModule);
jest.mock("../routes/audit.routes", () => mockRouterModule);
jest.mock("../routes/share.routes", () => mockRouterModule);

import { createServer } from "../server";

describe("createServer /health", () => {
  it("mounts GET /health at the service root and reports a healthy Vault", async () => {
    mockedCheckHealth.mockResolvedValue({
      initialized: true,
      sealed: false,
    });

    const response = await request(createServer()).get("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        status: "ok",
        vault_connected: true,
        latency_ms: expect.any(Number),
        environment: expect.any(String),
        timestamp: expect.any(String),
        uptime: expect.any(Number),
      }),
    );
    expect(response.body.latency_ms).toBeGreaterThan(0);
  });
});
