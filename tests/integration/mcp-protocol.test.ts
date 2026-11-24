import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

type JsonRpcResponse = {
  jsonrpc: string;
  id: number | string | null;
  result?: Record<string, unknown>;
  error?: { code: number; message: string };
};

async function postMcp(body: Record<string, unknown>, path = "/mcp"): Promise<Response> {
  return exports.default.fetch(`https://caio-mcp.example${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
    },
    body: JSON.stringify(body),
  });
}

async function parseMcpResponse(response: Response): Promise<JsonRpcResponse> {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();
  if (contentType.includes("text/event-stream")) {
    const dataLine = text
      .split("\n")
      .map((line) => line.trim())
      .find((line) => line.startsWith("data:"));
    if (dataLine === undefined) {
      throw new Error(`No SSE data line in response: ${text}`);
    }
    return JSON.parse(dataLine.slice("data:".length).trim()) as JsonRpcResponse;
  }
  return JSON.parse(text) as JsonRpcResponse;
}

describe("MCP Streamable HTTP protocol integration (workerd)", () => {
  it("handles initialize statelessly", async () => {
    const res = await postMcp({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2025-11-25",
        capabilities: {},
        clientInfo: { name: "vitest-client", version: "1.0.0" },
      },
    });

    expect(res.status).toBe(200);
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toBe("no-store");
    const payload = await parseMcpResponse(res);
    expect(payload.error).toBeUndefined();
    expect(payload.result?.["serverInfo"]).toEqual({ name: "caio-mcp", version: "1.0.0" });
  });

  it("lists exactly 6 read-only tools", async () => {
    const res = await postMcp({
      jsonrpc: "2.0",
      id: 2,
      method: "tools/list",
      params: {},
    });

    expect(res.status).toBe(200);
    const payload = await parseMcpResponse(res);
    const tools = payload.result?.["tools"] as {
      name: string;
      annotations?: { readOnlyHint?: boolean; openWorldHint?: boolean };
    }[];
    expect(tools.map((t) => t.name).sort()).toEqual([
      "get_articles",
      "get_experience",
      "get_profile",
      "get_project",
      "get_stack",
      "list_projects",
    ]);
    for (const tool of tools) {
      expect(tool.annotations?.readOnlyHint).toBe(true);
      expect(tool.annotations?.openWorldHint).toBe(false);
    }
  });

  it("executes all 6 tools over Streamable HTTP", async () => {
    const calls: { name: string; arguments: Record<string, unknown> }[] = [
      { name: "get_profile", arguments: {} },
      { name: "get_experience", arguments: { lang: "pt-br", section: "primary" } },
      { name: "list_projects", arguments: {} },
      { name: "get_project", arguments: { slug: "phporto", lang: "en" } },
      { name: "get_stack", arguments: { focus: "primary" } },
      { name: "get_articles", arguments: { limit: 2 } },
    ];

    for (const [index, call] of calls.entries()) {
      const res = await postMcp({
        jsonrpc: "2.0",
        id: 10 + index,
        method: "tools/call",
        params: call,
      });

      expect(res.status).toBe(200);
      const payload = await parseMcpResponse(res);
      expect(payload.error).toBeUndefined();
      expect(payload.result?.["isError"]).not.toBe(true);
      expect(payload.result?.["structuredContent"]).toBeDefined();
    }
  });

  it("lists and resolves both MCP prompts", async () => {
    const listRes = await postMcp({
      jsonrpc: "2.0",
      id: 30,
      method: "prompts/list",
      params: {},
    });
    expect(listRes.status).toBe(200);
    const listPayload = await parseMcpResponse(listRes);
    const prompts = listPayload.result?.["prompts"] as { name: string }[];
    expect(prompts.map((p) => p.name).sort()).toEqual([
      "architecture_deep_dive",
      "recruiter_brief",
    ]);

    const briefRes = await postMcp({
      jsonrpc: "2.0",
      id: 31,
      method: "prompts/get",
      params: {
        name: "recruiter_brief",
        arguments: { lang: "pt-br", role_focus: "php-laravel" },
      },
    });
    expect(briefRes.status).toBe(200);
    const briefPayload = await parseMcpResponse(briefRes);
    expect(briefPayload.error).toBeUndefined();
    expect(Array.isArray(briefPayload.result?.["messages"])).toBe(true);

    const deepDiveRes = await postMcp({
      jsonrpc: "2.0",
      id: 32,
      method: "prompts/get",
      params: {
        name: "architecture_deep_dive",
        arguments: { project_slug: "keeptask", lang: "en" },
      },
    });
    expect(deepDiveRes.status).toBe(200);
    const deepDivePayload = await parseMcpResponse(deepDiveRes);
    expect(deepDivePayload.error).toBeUndefined();
    expect(Array.isArray(deepDivePayload.result?.["messages"])).toBe(true);
  });
});
