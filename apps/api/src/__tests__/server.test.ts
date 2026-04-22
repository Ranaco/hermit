import supertest from "supertest";
import { describe, it, expect, jest } from "@jest/globals";

const initializeMock = jest.fn(async () => undefined);
const checkHealthMock = jest.fn(async () => ({ initialized: true, sealed: false }));

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
    initialize: initializeMock,
    testConnection: jest.fn(async () => true),
    checkHealth: checkHealthMock,
  }),
}));

import { createServer } from "../server";

describe("Server", () => {
  it("returns vault health details when Vault is reachable", async () => {
    checkHealthMock.mockResolvedValueOnce({ initialized: true, sealed: false });

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

  it("returns a 200 response with vault disconnected state when Vault is down", async () => {
    checkHealthMock.mockRejectedValueOnce(new Error("Vault unavailable"));

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
