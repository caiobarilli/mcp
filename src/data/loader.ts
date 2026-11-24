import rawArticles from "../../data/articles.json";
import rawExperience from "../../data/experience.json";
import rawMeta from "../../data/meta.json";
import rawProfile from "../../data/profile.json";
import rawProjects from "../../data/projects.json";
import rawStack from "../../data/stack.json";
import {
  ArticlesDataSchema,
  ExperienceDataSchema,
  MetaDataSchema,
  ProfileDataSchema,
  ProjectsDataSchema,
  StackDataSchema,
  type ArticlesData,
  type ExperienceData,
  type MetaData,
  type ProfileData,
  type ProjectsData,
  type StackData,
} from "./schemas.js";

export type PortfolioData = {
  readonly meta: MetaData;
  readonly profile: ProfileData;
  readonly experience: ExperienceData;
  readonly projects: ProjectsData;
  readonly stack: StackData;
  readonly articles: ArticlesData;
};

let cachedData: PortfolioData | undefined;

export function getPortfolioData(): PortfolioData {
  if (cachedData !== undefined) {
    return cachedData;
  }

  cachedData = Object.freeze({
    meta: MetaDataSchema.parse(rawMeta),
    profile: ProfileDataSchema.parse(rawProfile),
    experience: ExperienceDataSchema.parse(rawExperience),
    projects: ProjectsDataSchema.parse(rawProjects),
    stack: StackDataSchema.parse(rawStack),
    articles: ArticlesDataSchema.parse(rawArticles),
  });

  return cachedData;
}
