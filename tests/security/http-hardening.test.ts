import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { MAX_REQUEST_BODY_BYTES } from "../../src/http/security.js";

describe("HTTP security hardening (workerd)", () => {
  it("rejects non-POST methods without CORS preflight with 405 and Allow: POST, OPTIONS", async () => {
    for (const method of ["GET", "PUT", "DELETE", "PATCH", "OPTIONS"]) {
      const res = await exports.default.fetch("https://mcp.example/mcp", { method });
      expect(res.status).toBe(405);
      expect(res.headers.get("allow")).toBe("POST, OPTIONS");
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
    }
  });

  it("rejects Origin: null and unauthorized cross-site origins with 403 and no CORS allow header", async () => {
    for (const origin of [
      "null",
      "https://evil.example",
      "http://attacker.local",
      "http://caiobarilli.github.io",
      "https://caiobarilli.github.io.evil.example",
      "javascript:alert(1)",
    ]) {
      const res = await exports.default.fetch("https://mcp.example/mcp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
      });
      expect(res.status).toBe(403);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      expect(res.headers.get("access-control-allow-credentials")).toBeNull();
      expect(res.headers.get("vary")).toBe("Origin");
    }
  });

  it("allows CORS preflight OPTIONS for allowlisted origins with valid method and headers", async () => {
    for (const origin of [
      "https://caiobarilli.github.io",
      "http://localhost:3000",
      "http://127.0.0.1:4173",
      "https://mcp.example",
    ]) {
      const res = await exports.default.fetch("https://mcp.example/mcp", {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type, accept, mcp-protocol-version",
        },
      });
      expect(res.status).toBe(204);
      expect(res.headers.get("access-control-allow-origin")).toBe(origin);
      expect(res.headers.get("access-control-allow-origin")).not.toBe("*");
      expect(res.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
      expect(res.headers.get("access-control-allow-headers")).toBe(
        "Content-Type, Accept, MCP-Protocol-Version",
      );
      expect(res.headers.get("access-control-allow-credentials")).toBeNull();
      expect(res.headers.get("access-control-max-age")).toBe("86400");
      expect(res.headers.get("vary")).toContain("Origin");
      expect(res.headers.get("cache-control")).toBe("no-store");
      expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    }
  });

  it("rejects CORS preflight OPTIONS from unauthorized origins with 403", async () => {
    for (const origin of [
      "null",
      "https://evil.example",
      "http://caiobarilli.github.io",
      "https://caiobarilli.github.io.evil.example",
    ]) {
      const res = await exports.default.fetch("https://mcp.example/mcp", {
        method: "OPTIONS",
        headers: {
          Origin: origin,
          "Access-Control-Request-Method": "POST",
          "Access-Control-Request-Headers": "content-type, accept",
        },
      });
      expect(res.status).toBe(403);
      expect(res.headers.get("access-control-allow-origin")).toBeNull();
      expect(res.headers.get("access-control-allow-credentials")).toBeNull();
    }
  });

  it("rejects CORS preflight OPTIONS with disallowed method or headers", async () => {
    const badMethod = await exports.default.fetch("https://mcp.example/mcp", {
      method: "OPTIONS",
      headers: {
        Origin: "https://caiobarilli.github.io",
        "Access-Control-Request-Method": "DELETE",
      },
    });
    expect(badMethod.status).toBe(405);
    expect(badMethod.headers.get("access-control-allow-origin")).toBeNull();

    const missingMethod = await exports.default.fetch("https://mcp.example/mcp", {
      method: "OPTIONS",
      headers: {
        Origin: "https://caiobarilli.github.io",
      },
    });
    expect(missingMethod.status).toBe(405);
    expect(missingMethod.headers.get("access-control-allow-origin")).toBeNull();

    const badHeader = await exports.default.fetch("https://mcp.example/mcp", {
      method: "OPTIONS",
      headers: {
        Origin: "https://caiobarilli.github.io",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type, authorization",
      },
    });
    expect(badHeader.status).toBe(403);
    expect(badHeader.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("returns exact CORS headers on POST success and error for allowlisted origins", async () => {
    for (const origin of ["https://caiobarilli.github.io", "http://localhost:4173"]) {
      const okRes = await exports.default.fetch("https://mcp.example/mcp", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "get_profile", arguments: { lang: "pt-br" } },
        }),
      });
      expect(okRes.status).toBe(200);
      expect(okRes.headers.get("access-control-allow-origin")).toBe(origin);
      expect(okRes.headers.get("access-control-allow-credentials")).toBeNull();
      expect(okRes.headers.get("vary")).toBe("Origin");
      expect(okRes.headers.get("cache-control")).toBe("no-store");
      expect(okRes.headers.get("x-content-type-options")).toBe("nosniff");

      const errRes = await exports.default.fetch("https://mcp.example/mcp", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "text/plain",
        },
        body: "invalid",
      });
      expect(errRes.status).toBe(415);
      expect(errRes.headers.get("access-control-allow-origin")).toBe(origin);
      expect(errRes.headers.get("access-control-allow-credentials")).toBeNull();
      expect(errRes.headers.get("vary")).toBe("Origin");

      const badJsonRes = await exports.default.fetch("https://mcp.example/mcp", {
        method: "POST",
        headers: {
          Origin: origin,
          "Content-Type": "application/json",
        },
        body: "{bad",
      });
      expect(badJsonRes.status).toBe(400);
      expect(badJsonRes.headers.get("access-control-allow-origin")).toBe(origin);
      expect(badJsonRes.headers.get("vary")).toBe("Origin");
    }
  });

  it("omits Access-Control-Allow-Origin on POST without Origin header", async () => {
    const res = await exports.default.fetch("https://mcp.example/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }),
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("rejects invalid Content-Type with 415", async () => {
    const res = await exports.default.fetch("https://mcp.example/mcp", {
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

    const res = await exports.default.fetch("https://mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: oversized,
    });
    expect(res.status).toBe(413);
  });

  it("returns sanitized JSON-RPC error without stack traces on invalid JSON or batch", async () => {
    const badJsonRes = await exports.default.fetch("https://mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{not-json",
    });
    expect(badJsonRes.status).toBe(400);
    const badText = await badJsonRes.text();
    expect(badText).not.toContain("at ");
    expect(badText).not.toContain("src/");

    const batchRes = await exports.default.fetch("https://mcp.example/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify([{ jsonrpc: "2.0", id: 1, method: "tools/list", params: {} }]),
    });
    expect(batchRes.status).toBe(400);
  });

  it("returns 404 for unknown paths", async () => {
    const res = await exports.default.fetch("https://mcp.example/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(res.status).toBe(404);
  });
});
