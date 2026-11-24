import { describe, expect, it } from "vitest";
import { buildToolResult, MAX_RESPONSE_BYTES } from "../../src/data/localize.js";
import { ProjectSlugValues } from "../../src/data/schemas.js";
import { GetArticlesInputSchema, handleGetArticles } from "../../src/tools/get-articles.js";
import { GetExperienceInputSchema, handleGetExperience } from "../../src/tools/get-experience.js";
import { GetProfileInputSchema, handleGetProfile } from "../../src/tools/get-profile.js";
import { GetProjectInputSchema, handleGetProject } from "../../src/tools/get-project.js";
import { GetStackInputSchema, handleGetStack } from "../../src/tools/get-stack.js";
import { handleListProjects, ListProjectsInputSchema } from "../../src/tools/list-projects.js";

describe("tools deterministic logic and response budgets", () => {
  it("defaults lang to en across tools", () => {
    const profile = handleGetProfile(GetProfileInputSchema.parse({}));
    expect(profile.meta.lang).toBe("en");
    expect(profile.data["timezone"]).toBe("UTC-3");
    expect(profile.data["story"]).toBeUndefined();

    const profileWithStory = handleGetProfile(
      GetProfileInputSchema.parse({ lang: "pt-br", include_story: true }),
    );
    expect(profileWithStory.meta.lang).toBe("pt-br");
    expect(Array.isArray(profileWithStory.data["story"])).toBe(true);
  });

  it("returns all 10 projects when list_projects has no filters", () => {
    const result = handleListProjects(ListProjectsInputSchema.parse({}));
    expect(result.data.total).toBe(10);

    const paused = handleListProjects(ListProjectsInputSchema.parse({ status: "paused" }));
    expect(paused.data.total).toBe(1);

    const flagships = handleListProjects(ListProjectsInputSchema.parse({ tier: "flagship" }));
    expect(flagships.data.total).toBe(6);

    const laravel = handleListProjects(ListProjectsInputSchema.parse({ tech: "laravel" }));
    expect(laravel.data.total).toBe(3);
  });

  it("filters get_experience by section", () => {
    const primaryOnly = handleGetExperience(GetExperienceInputSchema.parse({ section: "primary" }));
    expect(primaryOnly.data["primary_roles"]).toBeDefined();
    expect(primaryOnly.data["earlier_roles"]).toBeUndefined();

    const educationOnly = handleGetExperience(
      GetExperienceInputSchema.parse({ lang: "pt-br", section: "education" }),
    );
    expect(educationOnly.data["education"]).toBeDefined();
    expect(educationOnly.data["primary_roles"]).toBeUndefined();
  });

  it("filters get_stack by domain and focus", () => {
    const devops = handleGetStack(
      GetStackInputSchema.parse({ domain: "devops-iac", focus: "primary" }),
    );
    expect(devops.data.total > 0).toBe(true);
  });

  it("limits get_articles cleanly and marks original_language pt-br", () => {
    const result = handleGetArticles(GetArticlesInputSchema.parse({ lang: "en", limit: 2 }));
    expect(result.data.total).toBe(2);
    expect(result.data.articles.map((a) => a.original_language)).toEqual(["pt-br", "pt-br"]);
  });

  it("keeps every tool response under 16 KB in both locales", () => {
    const payloads = [
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

    for (const payload of payloads) {
      const result = buildToolResult(payload);
      const bytes = new TextEncoder().encode(result.content[0].text).byteLength;
      expect(bytes).toBeLessThanOrEqual(MAX_RESPONSE_BYTES);
    }
  });
});
