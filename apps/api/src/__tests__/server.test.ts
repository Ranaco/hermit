import supertest from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

const mockCheckDatabaseConnection = jest.fn<() => Promise<boolean>>();
const mockCheckEncryptionHealth = jest.fn<() => Promise<{ initialized: boolean }>>();

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
}));

jest.mock("@hermit/vault-client", () => ({
  createVaultService: () => ({
    initialize: async () => undefined,
    testConnection: async () => true,
    checkHealth: async () => ({ initialized: true }),
  }),
}));

jest.mock("../services/prisma.service", () => ({
  __esModule: true,
  default: jest.fn(),
  checkDatabaseConnection: mockCheckDatabaseConnection,
}));

jest.mock("../services/encryption.service", () => ({
  __esModule: true,
  checkHealth: mockCheckEncryptionHealth,
}));

import { createServer } from "../server";
import {
  markApplicationReady,
  resetApplicationReadiness,
} from "../readiness";

describe("Server", () => {
  beforeEach(() => {
    resetApplicationReadiness();
    mockCheckDatabaseConnection.mockResolvedValue(true);
    mockCheckEncryptionHealth.mockResolvedValue({ initialized: true });
  });

  it("health check returns 200", async () => {
    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.ok).toBe(true);
      });
  });

  it("readyz returns 200 when the application is booted and dependencies are available", async () => {
    markApplicationReady();

    await supertest(createServer())
      .get("/readyz")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({ status: "ready" });
      });
  });

  it("readyz returns 503 when a required startup dependency is unavailable", async () => {
    markApplicationReady();
    mockCheckDatabaseConnection.mockResolvedValue(false);

    await supertest(createServer())
      .get("/readyz")
      .expect(503)
      .then((res) => {
        expect(res.body).toEqual({ status: "not_ready" });
      });
  });
});
