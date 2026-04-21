import supertest from "supertest";
import { describe, it, expect, jest } from "@jest/globals";

const mockVaultCheckHealth = jest.fn(async () => ({ initialized: true }));

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
    checkHealth: mockVaultCheckHealth,
  }),
}));

import { createServer } from "../server";

describe("Server", () => {
  it("GET /health returns healthy Vault status when Vault is reachable", async () => {
    mockVaultCheckHealth.mockResolvedValueOnce({ initialized: true });

    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          status: "healthy",
          vault_connected: true,
          latency_ms: expect.any(Number),
        });
      });
  });

  it("GET /health returns unhealthy Vault status when Vault is unreachable", async () => {
    mockVaultCheckHealth.mockRejectedValueOnce(new Error("connect ECONNREFUSED"));

    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          status: "unhealthy",
          vault_connected: false,
          latency_ms: expect.any(Number),
        });
      });
  });
});
