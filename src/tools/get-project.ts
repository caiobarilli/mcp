import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getPortfolioData } from "../data/loader.js";
import { buildEnvelope, buildToolResult, pickLocale } from "../data/localize.js";
import { LocaleSchema, ProjectSlugSchema } from "../data/schemas.js";

export const GetProjectInputSchema = z
  .object({
    slug: ProjectSlugSchema,
    lang: LocaleSchema.default("en"),
  })
  .strict();

export type GetProjectInput = z.infer<typeof GetProjectInputSchema>;

export function handleGetProject(input: GetProjectInput) {
  const { meta, projects } = getPortfolioData();
  const { slug, lang } = input;

  const project = projects.projects.find((item) => item.slug === slug);
  if (project === undefined) {
    throw new Error(`Project not found: ${slug}`);
  }

  return buildEnvelope(meta, lang, `projects/${project.slug}/`, {
    slug: project.slug,
    title: pickLocale(project.title, lang),
    tier: project.tier,
    status: project.status,
    category: project.category,
    year: project.year,
    type: pickLocale(project.type, lang),
    summary: pickLocale(project.summary, lang),
    role_and_ownership: pickLocale(project.role_and_ownership, lang),
    problem: pickLocale(project.problem, lang),
    solution: pickLocale(project.solution, lang),
    metrics: project.metrics.map((metric) => ({
      label: pickLocale(metric.label, lang),
      value: metric.value,
    })),
    highlights: project.highlights.map((item) => pickLocale(item, lang)),
    adrs: project.adrs.map((adr) => ({
      ...(adr.id !== undefined ? { id: adr.id } : {}),
      title: pickLocale(adr.title, lang),
      decision: pickLocale(adr.decision, lang),
    })),
    stack: project.stack,
    links: {
      case_study: pickLocale(project.links.case_study, lang),
      ...(project.links.repository !== undefined ? { repository: project.links.repository } : {}),
      ...(project.links.product_site !== undefined
        ? { product_site: project.links.product_site }
        : {}),
      source_visibility: project.links.source_visibility,
    },
  });
}

export function registerGetProjectTool(server: McpServer): void {
  server.registerTool(
    "get_project",
    {
      title: "Get Caio Barilli Project Case Study",
      description:
        "Returns the structured case study for a single project (problem, solution, ownership scope, public metrics, highlights, architecture decisions/ADRs, stack and links). Accepts a closed enum of the 10 project slugs.",
      inputSchema: GetProjectInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) => buildToolResult(handleGetProject(GetProjectInputSchema.parse(args))),
  );
}
