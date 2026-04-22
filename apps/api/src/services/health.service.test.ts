import { describe, expect, it, jest } from "@jest/globals";
import { getVaultHealthResponse } from "./health.service";

describe("health.service", () => {
  it("returns a healthy vault response when Vault is reachable", async () => {
    const checkVaultHealth = jest.fn(async () => ({
      initialized: true,
      sealed: false,
    }));
    const now = jest.fn(() => 0);
    now.mockReturnValueOnce(100).mockReturnValueOnce(145);

    const response = await getVaultHealthResponse(checkVaultHealth, now);

    expect(checkVaultHealth).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      status: "healthy",
      vault_connected: true,
      latency_ms: 45,
    });
  });

  it("returns an unhealthy vault response when Vault is down", async () => {
    const checkVaultHealth = jest.fn(async () => {
      throw new Error("Vault unavailable");
    });
    const now = jest.fn(() => 0);
    now.mockReturnValueOnce(200).mockReturnValueOnce(260);

    const response = await getVaultHealthResponse(checkVaultHealth, now);

    expect(checkVaultHealth).toHaveBeenCalledTimes(1);
    expect(response).toEqual({
      status: "unhealthy",
      vault_connected: false,
      latency_ms: 60,
    });
  });
});
