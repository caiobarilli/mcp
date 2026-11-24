import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { LocaleSchema, RoleFocusSchema } from "../data/schemas.js";

export const RecruiterBriefArgsSchema = z
  .object({
    lang: LocaleSchema.default("en"),
    role_focus: RoleFocusSchema.default("php-laravel"),
  })
  .strict();

export function registerRecruiterBriefPrompt(server: McpServer): void {
  server.registerPrompt(
    "recruiter_brief",
    {
      title: "30-Second Recruiter Brief",
      description:
        "Guides the assistant to fetch Caio Barilli's profile, primary experience, and flagship projects to produce an objective 30-second screening brief.",
      argsSchema: RecruiterBriefArgsSchema,
    },
    (rawArgs) => {
      const { lang, role_focus } = RecruiterBriefArgsSchema.parse(rawArgs);

      const text =
        lang === "pt-br"
          ? [
              `Monte um resumo objetivo de triagem em 30 segundos sobre Caio Barilli com foco em vagas de "${role_focus}".`,
              `1. Chame get_profile(lang="pt-br"), get_experience(lang="pt-br", section="primary") e list_projects(lang="pt-br", tier="flagship").`,
              `2. Destaque: anos de experiência, fuso horário (UTC-3), stack principal em produção vs. histórico, passagens como Tech Lead e os projetos flagship com seus status reais (ex.: PHPorto pausado).`,
              `3. Inclua os canais públicos de contato retornados por get_profile.`,
              `4. Regra estrita: use apenas os fatos retornados pelas tools; não invente salário, nível de inglês, telefone, e-mail ou detalhes internos omitidos.`,
            ].join("\n")
          : [
              `Prepare an objective 30-second recruiting brief on Caio Barilli tailored to "${role_focus}" roles.`,
              `1. Call get_profile(lang="en"), get_experience(lang="en", section="primary"), and list_projects(lang="en", tier="flagship").`,
              `2. Highlight: years of experience, timezone (UTC-3), primary production stack vs. earlier stack, Tech Lead history, and flagship projects with accurate status (e.g., PHPorto is paused).`,
              `3. Include only the public contact links returned by get_profile.`,
              `4. Strict rule: rely only on facts returned by the tools; do not extrapolate omitted private data (salary, phone, email, unpublished roles, or internal details).`,
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
