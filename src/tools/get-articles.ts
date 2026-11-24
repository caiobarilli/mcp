import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { getPortfolioData } from "../data/loader.js";
import { buildEnvelope, buildToolResult, pickLocale } from "../data/localize.js";
import { LocaleSchema } from "../data/schemas.js";

export const GetArticlesInputSchema = z
  .object({
    lang: LocaleSchema.default("en"),
    limit: z.number().int().min(1).max(3).default(3),
  })
  .strict();

export type GetArticlesInput = z.infer<typeof GetArticlesInputSchema>;

export function handleGetArticles(input: GetArticlesInput) {
  const { meta, articles } = getPortfolioData();
  const { lang, limit } = input;

  const selected = articles.articles.slice(0, limit).map((article) => ({
    slug: article.slug,
    title: pickLocale(article.title, lang),
    summary: pickLocale(article.summary, lang),
    published_at: article.published_at,
    url: article.url,
    original_language: article.original_language,
    topics: article.topics,
  }));

  return buildEnvelope(meta, lang, "", {
    total: selected.length,
    articles: selected,
  });
}

export function registerGetArticlesTool(server: McpServer): void {
  server.registerTool(
    "get_articles",
    {
      title: "Get Caio Barilli Selected Articles",
      description:
        "Returns Caio Barilli's 3 selected technical articles published on Medium (NativePHP on Windows, multi-agent Laravel workflows, Debian Hyper-V + Docker + Terraform), explicitly noting original_language: pt-br.",
      inputSchema: GetArticlesInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    (args) => buildToolResult(handleGetArticles(GetArticlesInputSchema.parse(args))),
  );
}
