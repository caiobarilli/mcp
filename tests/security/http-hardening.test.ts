import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { MAX_REQUEST_BODY_BYTES } from "../../src/http/security.js";

describe("HTTP security hardening (workerd)", () => {
  it("rejects non-POST methods with 405 and Allow: POST", async () => {
    for (const method of ["GET", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      const res = await exports.default.fetch("https://caio-mcp.example/mcp", { method });
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST");
    }
  });

  it("rejects Origin: null and cross-site origins with 403", async () => {
    for (const origin of ["null", "https://evil.example", "http://attacker.local"]) {
      const res = await exports.default.fetch("https://caio-mcp.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(res.status).toBe(403);
    }
  });

  it("rejects invalid Content-Type with 415", async () => {
    const res = await exports.default.fetch("https://caio-mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: "hello",
    });
    expect(res.status).toBe(415);
  });

  it("rejects bodies larger than 16 KB with 413", async () => {
    const oversized = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: { pad: "a".repeat(MAX_REQUEST_BODY_BYTES + 128) },
    });

    const res = await exports.default.fetch("https://caio-mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversized,
    });
    expect(res.status).toBe(413);
  });

  it("returns sanitized JSON-RPC error without stack traces on invalid JSON or batch", async () => {
    const badJsonRes = await exports.default.fetch("https://caio-mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    expect(badJsonRes.status).toBe(400);
    const badText = await badJsonRes.text();
    expect(badText).not.toContain("at ");
    expect(badText).not.toContain("src/");

    const batchRes = await exports.default.fetch("https://caio-mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }]),
    });
    expect(batchRes.status).toBe(400);
  });

  it("returns 404 for unknown paths", async () => {
    const res = await exports.default.fetch("https://caio-mcp.example/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(404);
  });
});
