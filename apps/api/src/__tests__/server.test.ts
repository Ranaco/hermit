import supertest from "supertest";
import { describe, it, expect, jest } from "@jest/globals";

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

describe("Server", () => {
  it("returns vault connectivity details when Vault is reachable", async () => {
    jest.mocked(checkEncryptionHealth).mockResolvedValueOnce({ initialized: true });

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

  it("returns degraded health details when Vault is unreachable", async () => {
    jest.mocked(checkEncryptionHealth).mockRejectedValueOnce(new Error("vault down"));

    await supertest(createServer())
      .get("/health")
      .expect(200)
      .then((res) => {
        expect(res.body).toEqual({
          status: "degraded",
          vault_connected: false,
          latency_ms: expect.any(Number),
        });
      });
  });
});
