import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getPortfolioData } from "../data/loader.js";
import { buildEnvelope, buildToolResult, pickLocale } from "../data/localize.js";
import { LocaleSchema } from "../data/schemas.js";

export const GetProfileInputSchema = z
  .object({
    lang: LocaleSchema.default("en"),
    include_story: z.boolean().default(false),
  })
  .strict();

export type GetProfileInput = z.infer<typeof GetProfileInputSchema>;

export function handleGetProfile(input: GetProfileInput) {
  const { meta, profile } = getPortfolioData();
  const { lang, include_story } = input;

  const data: Record<string, unknown> = {
    name: profile.name,
    headline: pickLocale(profile.headline, lang),
    years_experience: profile.years_experience,
    timezone: profile.timezone,
    summary: pickLocale(profile.summary, lang),
    current_focus: profile.current_focus.map((item) => pickLocale(item, lang)),
    availability: pickLocale(profile.availability, lang),
    links: {
      portfolio: pickLocale(profile.links.portfolio, lang),
      contact_page: pickLocale(profile.links.contact_page, lang),
      github: profile.links.github,
      linkedin: profile.links.linkedin,
      medium: profile.links.medium,
    },
  };

  if (include_story) {
    data["story"] = profile.story.map((paragraph) => pickLocale(paragraph, lang));
  }

  return buildEnvelope(meta, lang, "", data);
}

export function registerGetProfileTool(server: McpServer): void {
  server.registerTool(
    "get_profile",
    {
      title: "Get Caio Barilli Profile",
      description:
        "Returns Caio Barilli's identity, 30-second executive summary, timezone (UTC-3), current focus, availability, public links (portfolio, contact page, GitHub, LinkedIn, Medium), and optionally the full career story.",
      inputSchema: GetProfileInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) => buildToolResult(handleGetProfile(GetProfileInputSchema.parse(args))),
  );
}
