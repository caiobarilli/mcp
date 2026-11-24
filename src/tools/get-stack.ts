import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getPortfolioData } from "../data/loader.js";
import { buildEnvelope, buildToolResult, pickLocale } from "../data/localize.js";
import { LocaleSchema, StackDomainSchema, StackFocusSchema } from "../data/schemas.js";

export const GetStackInputSchema = z
  .object({
    lang: LocaleSchema.default("en"),
    domain: StackDomainSchema.optional(),
    focus: StackFocusSchema.optional(),
  })
  .strict();

export type GetStackInput = z.infer<typeof GetStackInputSchema>;

export function handleGetStack(input: GetStackInput) {
  const { meta, stack } = getPortfolioData();
  const { lang, domain, focus } = input;

  const filtered = stack.items.filter((item) => {
    if (domain !== undefined && item.domain !== domain) {
      return false;
    }
    if (focus !== undefined && item.focus !== focus) {
      return false;
    }
    return true;
  });

  const items = filtered.map((item) => ({
    id: item.id,
    name: item.name,
    domain: item.domain,
    focus: item.focus,
    ...(item.notes !== undefined ? { notes: pickLocale(item.notes, lang) } : {}),
    project_slugs: item.project_slugs,
  }));

  return buildEnvelope(meta, lang, "", {
    total: items.length,
    items,
  });
}

export function registerGetStackTool(server: McpServer): void {
  server.registerTool(
    "get_stack",
    {
      title: "Get Caio Barilli Tech Stack",
      description:
        "Returns Caio Barilli's technology matrix grouped by domain (backend, devops-iac, ai-agents, frontend-legacy) and focus (primary current production vs secondary/earlier), linked to supporting project_slugs.",
      inputSchema: GetStackInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) => buildToolResult(handleGetStack(GetStackInputSchema.parse(args))),
  );
}
