import { describe, it, expect, jest } from "@jest/globals";

jest.mock("../services/encryption.service", () => ({
  checkHealth: jest.fn(),
}));

import { createHealthHandler } from "../routes/health.routes";
import { checkHealth } from "../services/encryption.service";

const mockedCheckHealth = jest.mocked(checkHealth);

function createMockResponse() {
  const response = {
    status: jest.fn(),
    json: jest.fn(),
  };

  response.status.mockReturnValue(response);
  return response;
}

describe("Health routes", () => {
  it("returns vault health details when Vault is reachable", async () => {
    mockedCheckHealth.mockResolvedValue({
      initialized: true,
      sealed: false,
    } as Awaited<ReturnType<typeof checkHealth>>);
    const response = createMockResponse();

    await createHealthHandler()({} as never, response as never, jest.fn());

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "ok",
      vault_connected: true,
      latency_ms: expect.any(Number),
    });
    expect(
      (response.json.mock.calls[0]?.[0] as { latency_ms: number }).latency_ms,
    ).toBeGreaterThan(0);
  });

  it("returns an error payload when Vault is unreachable", async () => {
    mockedCheckHealth.mockRejectedValue(new Error("vault unavailable"));
    const response = createMockResponse();

    await createHealthHandler()({} as never, response as never, jest.fn());

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.json).toHaveBeenCalledWith({
      status: "error",
      vault_connected: false,
      latency_ms: 0,
    });
  });
});
