import { describe, expect, it } from "vitest";
import rawArticles from "../../data/articles.json";
import rawExperience from "../../data/experience.json";
import rawMeta from "../../data/meta.json";
import rawProfile from "../../data/profile.json";
import rawProjects from "../../data/projects.json";
import rawStack from "../../data/stack.json";
import { ProjectSlugValues } from "../../src/data/schemas.js";
import { GetArticlesInputSchema, handleGetArticles } from "../../src/tools/get-articles.js";
import { GetExperienceInputSchema, handleGetExperience } from "../../src/tools/get-experience.js";
import { GetProfileInputSchema, handleGetProfile } from "../../src/tools/get-profile.js";
import { GetProjectInputSchema, handleGetProject } from "../../src/tools/get-project.js";
import { GetStackInputSchema, handleGetStack } from "../../src/tools/get-stack.js";
import { handleListProjects, ListProjectsInputSchema } from "../../src/tools/list-projects.js";

const FORBIDDEN_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "personal email", pattern: /caiobarilli@gmail\.com|@gmail\.com/i },
  { label: "CV PDF link", pattern: /\/cv\/|\.pdf\b/i },
  { label: "Brazilian phone/WhatsApp", pattern: /\+55\s?\d{2}|\(\d{2}\)\s?9?\d{4}-\d{4}/ },
  { label: "CPF pattern", pattern: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/ },
  { label: "unconfirmed marker", pattern: /A CONFIRMAR|\bTODO\b|\bFIXME\b/ },
  {
    label: "removed PHPorto remote desktop tools",
    pattern: /\bSunshine\b|\bMoonlight\b|\bRDP\b|Área de Trabalho Remota|Remote Desktop/i,
  },
  {
    label: "credential / token prefixes",
    pattern:
      /\bghp_[A-Za-z0-9]+|\bgithub_pat_[A-Za-z0-9]+|\bsk-[A-Za-z0-9]+|\bAKIA[0-9A-Z]{16}|\.env\b/,
  },
  {
    label: "prompt injection phrases",
    pattern:
      /ignore previous instructions|disregard above|system prompt|<\|im_start\|>|<\/system>/i,
  },
];

describe("NUNCA ENTRA blocklist & anti-injection guardrails", () => {
  it("contains zero forbidden terms or PII across all raw data/*.json files", () => {
    const datasets = [
      { name: "meta.json", value: rawMeta },
      { name: "profile.json", value: rawProfile },
      { name: "experience.json", value: rawExperience },
      { name: "projects.json", value: rawProjects },
      { name: "stack.json", value: rawStack },
      { name: "articles.json", value: rawArticles },
    ];

    for (const dataset of datasets) {
      const serialized = JSON.stringify(dataset.value);
      for (const rule of FORBIDDEN_PATTERNS) {
        expect(serialized, `${dataset.name} matched forbidden rule: ${rule.label}`).not.toMatch(
          rule.pattern,
        );
      }
    }
  });

  it("contains zero forbidden terms across all tool outputs in en and pt-br", () => {
    const outputs = [
      handleGetProfile(GetProfileInputSchema.parse({ lang: "en", include_story: true })),
      handleGetProfile(GetProfileInputSchema.parse({ lang: "pt-br", include_story: true })),
      handleGetExperience(GetExperienceInputSchema.parse({ lang: "en", section: "all" })),
      handleGetExperience(GetExperienceInputSchema.parse({ lang: "pt-br", section: "all" })),
      handleListProjects(ListProjectsInputSchema.parse({ lang: "en" })),
      handleListProjects(ListProjectsInputSchema.parse({ lang: "pt-br" })),
      handleGetStack(GetStackInputSchema.parse({ lang: "en" })),
      handleGetStack(GetStackInputSchema.parse({ lang: "pt-br" })),
      handleGetArticles(GetArticlesInputSchema.parse({ lang: "en", limit: 3 })),
      handleGetArticles(GetArticlesInputSchema.parse({ lang: "pt-br", limit: 3 })),
      ...ProjectSlugValues.flatMap((slug) => [
        handleGetProject(GetProjectInputSchema.parse({ slug, lang: "en" })),
        handleGetProject(GetProjectInputSchema.parse({ slug, lang: "pt-br" })),
      ]),
    ];

    for (const output of outputs) {
      const serialized = JSON.stringify(output);
      for (const rule of FORBIDDEN_PATTERNS) {
        expect(serialized, `Tool output matched forbidden rule: ${rule.label}`).not.toMatch(
          rule.pattern,
        );
      }
    }
  });
});
