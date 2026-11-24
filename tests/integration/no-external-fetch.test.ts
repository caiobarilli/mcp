import { exports } from "cloudflare:workers";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("zero external fetch guarantee", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("never invokes globalThis.fetch when serving MCP requests", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    const requests = [
      { jsonrpc: "2.0", id: 1, method: "tools/list", params: {} },
      {
        jsonrpc: "2.0",
        id: 2,
        method: "tools/call",
        params: { name: "get_profile", arguments: {} },
      },
      {
        jsonrpc: "2.0",
        id: 3,
        method: "tools/call",
        params: { name: "get_project", arguments: { slug: "keeptask" } },
      },
      {
        jsonrpc: "2.0",
        id: 4,
        method: "prompts/get",
        params: { name: "recruiter_brief", arguments: { lang: "en" } },
      },
    ];

    for (const payload of requests) {
      const res = await exports.default.fetch("https://mcp.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify(payload),
      });
      expect(res.status).toBe(200);
      await res.text();
    }

    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
