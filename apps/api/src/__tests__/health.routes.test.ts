import { describe, expect, it, jest } from "@jest/globals";
import { createHealthHandler } from "../routes/health.routes";

function createMockResponse() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockReturnValue(response);
  return response;
}

describe("createHealthHandler", () => {
  it("returns the expected payload when Vault is reachable", async () => {
    const response = createMockResponse();

    await createHealthHandler({
      checkVaultHealth: async () => ({
        initialized: true,
        sealed: false,
      }),
    })({} as never, response as never, jest.fn());

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "ok",
      vault_connected: true,
      latency_ms: expect.any(Number),
      environment: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
    expect(
      (response.json.mock.calls[0]?.[0] as { latency_ms: number }).latency_ms,
    ).toBeGreaterThan(0);
  });

  it("returns an error payload when Vault is unreachable", async () => {
    const response = createMockResponse();

    await createHealthHandler({
      checkVaultHealth: async () => {
        throw new Error("vault unavailable");
      },
    })({} as never, response as never, jest.fn());

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "error",
      vault_connected: false,
      latency_ms: 0,
      environment: expect.any(String),
      timestamp: expect.any(String),
      uptime: expect.any(Number),
    });
  });
});
