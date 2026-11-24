import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getPortfolioData } from "../data/loader.js";
import { buildEnvelope, buildToolResult, pickLocale } from "../data/localize.js";
import {
  LocaleSchema,
  ProjectCategorySchema,
  ProjectStatusSchema,
  ProjectTierSchema,
  TechTagSchema,
} from "../data/schemas.js";

export const ListProjectsInputSchema = z
  .object({
    lang: LocaleSchema.default("en"),
    category: ProjectCategorySchema.optional(),
    status: ProjectStatusSchema.optional(),
    tier: ProjectTierSchema.optional(),
    tech: TechTagSchema.optional(),
  })
  .strict();

export type ListProjectsInput = z.infer<typeof ListProjectsInputSchema>;

export function handleListProjects(input: ListProjectsInput) {
  const { meta, projects } = getPortfolioData();
  const { lang, category, status, tier, tech } = input;

  const filtered = projects.projects.filter((project) => {
    if (category !== undefined && !project.category.includes(category)) {
      return false;
    }
    if (status !== undefined && project.status !== status) {
      return false;
    }
    if (tier !== undefined && project.tier !== tier) {
      return false;
    }
    if (tech !== undefined && !project.tech_tags.includes(tech)) {
      return false;
    }
    return true;
  });

  const items = filtered.map((project) => ({
    slug: project.slug,
    title: pickLocale(project.title, lang),
    tier: project.tier,
    status: project.status,
    category: project.category,
    year: project.year,
    type: pickLocale(project.type, lang),
    summary: pickLocale(project.summary, lang),
    stack: project.stack,
    case_study_url: pickLocale(project.links.case_study, lang),
  }));

  return buildEnvelope(meta, lang, "projects/", {
    total: items.length,
    projects: items,
  });
}

export function registerListProjectsTool(server: McpServer): void {
  server.registerTool(
    "list_projects",
    {
      title: "List Caio Barilli Projects",
      description:
        "Lists all 10 portfolio projects with tier (flagship vs archive), status (active, paused, completed), category, year, summary and stack. Supports optional strict enum filters. Call get_project with a returned slug for the full case study.",
      inputSchema: ListProjectsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) => buildToolResult(handleListProjects(ListProjectsInputSchema.parse(args))),
  );
}
