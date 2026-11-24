import { describe, expect, it } from "vitest";
import { formatMinimalLog } from "../../src/http/logger.js";

describe("minimal structured logger", () => {
  it("emits only the allowlisted keys", () => {
    const raw = formatMinimalLog({
      tool: "get_profile",
      status: 200,
      durationMs: 4.7,
      errorCode: null,
    });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(Object.keys(parsed).sort()).toEqual(["durationMs", "errorCode", "status", "tool"]);
    expect(parsed).toEqual({
      tool: "get_profile",
      status: 200,
      durationMs: 5,
      errorCode: null,
    });
  });

  it("sanitizes untrusted tool names and error codes", () => {
    const raw = formatMinimalLog({
      tool: "Bearer secret-token\nnewline",
      status: 403,
      durationMs: -10,
      errorCode: "bad error with spaces",
    });
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    expect(parsed).toEqual({
      tool: "unknown",
      status: 403,
      durationMs: 0,
      errorCode: "INTERNAL_ERROR",
    });
  });
});
