import { EventEmitter } from "node:events";
import { describe, expect, it, jest } from "@jest/globals";
import type { Express } from "express";

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

interface MockRequest extends EventEmitter {
  method: string;
  url: string;
  path: string;
  headers: Record<string, string>;
  connection: { remoteAddress: string };
  socket: { remoteAddress: string };
}

interface MockResponse extends EventEmitter {
  statusCode: number;
  body: string;
  headersSent: boolean;
  locals: Record<string, unknown>;
  setHeader: (name: string, value: string | string[]) => void;
  getHeader: (name: string) => string | string[] | undefined;
  removeHeader: (name: string) => void;
  end: (chunk?: string) => void;
  write: (chunk: string) => boolean;
}

async function performGet(app: Express, url: string): Promise<{ status: number; body: unknown }> {
  const req = new EventEmitter() as MockRequest;
  req.method = "GET";
  req.url = url;
  req.path = url;
  req.headers = {};
  req.connection = { remoteAddress: "127.0.0.1" };
  req.socket = { remoteAddress: "127.0.0.1" };

  const headers = new Map<string, string | string[]>();
  const res = new EventEmitter() as MockResponse;
  res.statusCode = 200;
  res.body = "";
  res.headersSent = false;
  res.locals = {};
  res.setHeader = (name, value) => {
    headers.set(name.toLowerCase(), value);
  };
  res.getHeader = (name) => headers.get(name.toLowerCase());
  res.removeHeader = (name) => {
    headers.delete(name.toLowerCase());
  };
  res.write = (chunk) => {
    res.body += chunk;
    return true;
  };
  res.end = (chunk) => {
    if (chunk) {
      res.body += chunk;
    }
    res.headersSent = true;
    res.emit("finish");
  };

  const response = new Promise<{ status: number; body: unknown }>((resolve, reject) => {
    res.once("finish", () => {
      try {
        resolve({
          status: res.statusCode,
          body: JSON.parse(res.body),
        });
      } catch (error) {
        reject(error);
      }
    });
  });

  app.handle(req as never, res as never);
  req.emit("end");

  return response;
}

describe("GET /health", () => {
  it("returns vault connectivity details when Vault is reachable", async () => {
    jest.mocked(checkEncryptionHealth).mockResolvedValueOnce({ initialized: true });

    const response = await performGet(createServer(), "/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "healthy",
      vault_connected: true,
      latency_ms: expect.any(Number),
    });
  });

  it("returns degraded health details when Vault is unreachable", async () => {
    jest.mocked(checkEncryptionHealth).mockRejectedValueOnce(new Error("vault down"));

    const response = await performGet(createServer(), "/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: "degraded",
      vault_connected: false,
      latency_ms: expect.any(Number),
    });
  });
});
