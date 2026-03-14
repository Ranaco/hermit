import supertest from "supertest";
import { describe, it, expect, jest } from "@jest/globals";

jest.mock("@hermes/logger", () => ({
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

jest.mock("@hermes/vault-client", () => ({
  createVaultService: () => ({
    initialize: async () => undefined,
    testConnection: async () => true,
    checkHealth: async () => ({ initialized: true }),
  }),
}));

import { createServer } from "../server";

describe("Server", () => {
  it("health check returns 200", async () => {
    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.ok).toBe(true);
      });
  });
});
