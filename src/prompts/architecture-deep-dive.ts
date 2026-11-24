import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { FlagshipSlugSchema, LocaleSchema } from "../data/schemas.js";

export const ArchitectureDeepDiveArgsSchema = z
  .object({
    project_slug: FlagshipSlugSchema,
    lang: LocaleSchema.default("en"),
  })
  .strict();

export function registerArchitectureDeepDivePrompt(server: McpServer): void {
  server.registerPrompt(
    "architecture_deep_dive",
    {
      title: "Senior Architecture Deep Dive",
      description:
        "Guides the assistant to inspect a flagship project's ADRs, ownership boundaries, metrics, and supporting stack for a senior technical interview.",
      argsSchema: ArchitectureDeepDiveArgsSchema,
    },
    (rawArgs) => {
      const { project_slug, lang } = ArchitectureDeepDiveArgsSchema.parse(rawArgs);

      const text =
        lang === "pt-br"
          ? [
              `Faça um deep dive técnico de nível sênior no projeto "${project_slug}" de Caio Barilli.`,
              `1. Chame get_project(slug="${project_slug}", lang="pt-br") e get_stack(lang="pt-br", focus="primary").`,
              `2. Estruture a análise em: Problema e contexto, Fronteira exata de ownership (o que o Caio construiu vs. o que ficou com terceiros/time), Decisões de arquitetura (ADRs) e trade-offs, Qualidade/testes/segurança e 3 perguntas técnicas aprofundadas para entrevista.`,
              `3. Regra estrita: baseie-se apenas nos dados públicos retornados pelas tools, sem inventar métricas ou detalhes internos.`,
            ].join("\n")
          : [
              `Conduct a senior-level architecture deep dive on Caio Barilli's project "${project_slug}".`,
              `1. Call get_project(slug="${project_slug}", lang="en") and get_stack(lang="en", focus="primary").`,
              `2. Structure the review around: Problem & context, Exact ownership boundary (what Caio built vs. what stayed with the team), Architecture decisions (ADRs) & trade-offs, Testing/security/IaC practices, and 3 targeted senior interview questions.`,
              `3. Strict rule: use only public facts returned by the tools; never invent metrics or internal details.`,
            ].join("\n");

      return {
        messages: [
          {
            role: "user" as const,
            content: {
              type: "text" as const,
              text,
            },
          },
        ],
      };
    },
  );
}
