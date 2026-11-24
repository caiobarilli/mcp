import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getPortfolioData } from "../data/loader.js";
import { buildEnvelope, buildToolResult, pickLocale } from "../data/localize.js";
import { ExperienceSectionSchema, LocaleSchema } from "../data/schemas.js";

export const GetExperienceInputSchema = z
  .object({
    lang: LocaleSchema.default("en"),
    section: ExperienceSectionSchema.default("all"),
  })
  .strict();

export type GetExperienceInput = z.infer<typeof GetExperienceInputSchema>;

export function handleGetExperience(input: GetExperienceInput) {
  const { meta, experience } = getPortfolioData();
  const { lang, section } = input;

  const data: Record<string, unknown> = {};

  if (section === "all" || section === "primary") {
    data["primary_roles"] = experience.primary_roles.map((role) => ({
      id: role.id,
      company: role.company,
      company_url: role.company_url,
      role: pickLocale(role.role, lang),
      period: role.period,
      location: pickLocale(role.location, lang),
      summary: pickLocale(role.summary, lang),
      stack: role.stack,
      is_tech_lead: role.is_tech_lead,
    }));
  }

  if (section === "all" || section === "earlier") {
    data["earlier_roles"] = experience.earlier_roles.map((role) => ({
      id: role.id,
      company: role.company,
      role: pickLocale(role.role, lang),
      period: role.period,
      summary: pickLocale(role.summary, lang),
      is_tech_lead: role.is_tech_lead,
    }));
  }

  if (section === "all" || section === "education") {
    data["education"] = experience.education.map((edu) => ({
      institution: pickLocale(edu.institution, lang),
      degree: pickLocale(edu.degree, lang),
      period: edu.period,
      ...(edu.hours !== undefined ? { hours: edu.hours } : {}),
      status: pickLocale(edu.status, lang),
    }));
  }

  if (section === "all" || section === "certifications") {
    data["certifications"] = experience.certifications.map((cert) => ({
      title: pickLocale(cert.title, lang),
      issuer: cert.issuer,
      date: cert.date,
      type: cert.type,
      original_language: cert.original_language,
    }));
  }

  return buildEnvelope(meta, lang, "experience/", data);
}

export function registerGetExperienceTool(server: McpServer): void {
  server.registerTool(
    "get_experience",
    {
      title: "Get Caio Barilli Experience",
      description:
        "Returns Caio Barilli's work history (primary roles at KeepCloud and AgroNegociar, earlier roles including 3 Tech Lead positions), formal education (FIAP MBA, Senac), and certifications/courses.",
      inputSchema: GetExperienceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) => buildToolResult(handleGetExperience(GetExperienceInputSchema.parse(args))),
  );
}
