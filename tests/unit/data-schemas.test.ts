import { describe, expect, it } from "vitest";
import { getPortfolioData } from "../../src/data/loader.js";
import { ProjectSlugValues } from "../../src/data/schemas.js";

describe("data schemas and factual integrity", () => {
  it("loads and validates all 6 JSON datasets strictly", () => {
    const data = getPortfolioData();
    expect(data.meta.default_locale).toBe("en");
    expect(data.meta.locales).toEqual(["en", "pt-br"]);
    expect(data.projects.projects).toHaveLength(10);
    expect(data.articles.articles).toHaveLength(3);
  });

  it("enforces approved portfolio facts and corrections", () => {
    const data = getPortfolioData();

    // KeepCloud period corrected to 2024–2026
    const keepcloud = data.experience.primary_roles.find((role) => role.id === "keepcloud");
    expect(keepcloud).toBeDefined();
    expect(keepcloud?.period).toBe("2024–2026");

    // PHPorto status corrected to paused
    const phporto = data.projects.projects.find((project) => project.slug === "phporto");
    expect(phporto).toBeDefined();
    expect(phporto?.status).toBe("paused");

    // Timezone included, no email or CV PDF links
    expect(data.profile.timezone).toBe("UTC-3");
    expect(Object.keys(data.profile.links).sort()).toEqual([
      "contact_page",
      "github",
      "linkedin",
      "medium",
      "portfolio",
    ]);

    // Tech Lead count (3 roles)
    const techLeadCount = data.experience.earlier_roles.filter((role) => role.is_tech_lead).length;
    expect(techLeadCount).toBe(3);
  });

  it("keeps referential integrity between stack project_slugs and projects", () => {
    const data = getPortfolioData();
    const validSlugs = new Set<string>(ProjectSlugValues);

    for (const project of data.projects.projects) {
      expect(validSlugs.has(project.slug)).toBe(true);
    }

    for (const item of data.stack.items) {
      for (const slug of item.project_slugs) {
        expect(validSlugs.has(slug)).toBe(true);
      }
    }
  });
});
