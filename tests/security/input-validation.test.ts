import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { GetArticlesInputSchema } from "../../src/tools/get-articles.js";
import { GetExperienceInputSchema } from "../../src/tools/get-experience.js";
import { GetProfileInputSchema } from "../../src/tools/get-profile.js";
import { GetProjectInputSchema } from "../../src/tools/get-project.js";
import { GetStackInputSchema } from "../../src/tools/get-stack.js";
import { ListProjectsInputSchema } from "../../src/tools/list-projects.js";

describe("strict Zod input validation", () => {
  it("rejects unknown keys on every tool schema (.strict())", () => {
    expect(GetProfileInputSchema.safeParse({ extra: true }).success).toBe(false);
    expect(GetExperienceInputSchema.safeParse({ extra: true }).success).toBe(false);
    expect(ListProjectsInputSchema.safeParse({ query: ".*" }).success).toBe(false);
    expect(GetProjectInputSchema.safeParse({ slug: "keeptask", extra: 1 }).success).toBe(false);
    expect(GetStackInputSchema.safeParse({ unknown: "x" }).success).toBe(false);
    expect(GetArticlesInputSchema.safeParse({ limit: 2, extra: "x" }).success).toBe(false);
  });

  it("rejects out-of-enum values and invalid bounds", () => {
    expect(GetProjectInputSchema.safeParse({ slug: "llm-gateway" }).success).toBe(false);
    expect(GetProjectInputSchema.safeParse({ slug: "../etc/passwd" }).success).toBe(false);
    expect(GetProfileInputSchema.safeParse({ lang: "es" }).success).toBe(false);
    expect(ListProjectsInputSchema.safeParse({ tech: "ruby" }).success).toBe(false);
    expect(GetArticlesInputSchema.safeParse({ limit: 0 }).success).toBe(false);
    expect(GetArticlesInputSchema.safeParse({ limit: 10 }).success).toBe(false);
    expect(GetArticlesInputSchema.safeParse({ limit: 1.5 }).success).toBe(false);
  });

  it("rejects invalid tool arguments over the live workerd endpoint", async () => {
    const res = await exports.default.fetch("https://mcp.example/mcp", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json, text/event-stream",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 99,
        method: "tools/call",
        params: {
          name: "get_project",
          arguments: { slug: "nonexistent-slug", extra: "blocked" },
        },
      }),
    });

    const text = await res.text();
    expect(text).toMatch(/error|isError/i);
    expect(text).not.toContain("src/tools/");
  });
});
