import { describe, it, expect, jest } from "@jest/globals";
import { log } from "..";

describe("@hermit/logger", () => {
  it("exposes expected log methods", () => {
    expect(typeof log.info).toBe("function");
    expect(typeof log.error).toBe("function");
    expect(typeof log.warn).toBe("function");
    expect(typeof log.debug).toBe("function");
    expect(typeof log.http).toBe("function");
  });

  it("log.info does not throw", () => {
    expect(() => log.info("hello")).not.toThrow();
  });
});
