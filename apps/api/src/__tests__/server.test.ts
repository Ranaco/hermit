import supertest from "supertest";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

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

const mockCheckHealth = jest.fn();

jest.mock("@hermit/vault-client", () => ({
  createVaultService: () => ({
    initialize: async () => undefined,
    testConnection: async () => true,
    checkHealth: mockCheckHealth,
  }),
}));

import { createServer } from "../server";

describe("Server", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    mockCheckHealth.mockReset();
  });

  it("health check returns vault connectivity when Vault is reachable", async () => {
    mockCheckHealth.mockResolvedValue({
      initialized: true,
      sealed: false,
    });
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(100)
      .mockReturnValueOnce(112);

    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          status: "ok",
          vault_connected: true,
          latency_ms: 12,
        });
      });
  });

  it("health check returns degraded payload when Vault is unreachable", async () => {
    mockCheckHealth.mockRejectedValue(new Error("connect ECONNREFUSED"));
    jest.spyOn(Date, "now")
      .mockReturnValueOnce(500)
      .mockReturnValueOnce(523);

    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          status: "degraded",
          vault_connected: false,
          latency_ms: 23,
        });
      });
  });
});
