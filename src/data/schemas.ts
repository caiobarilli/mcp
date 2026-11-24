import { z } from "zod";

export const LocaleSchema = z.enum(["en", "pt-br"]);
export type Locale = z.infer<typeof LocaleSchema>;

export const LocalizedStringSchema = z
  .object({
    en: z.string().min(1),
    "pt-br": z.string().min(1),
  })
  .strict();
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;

export const ProjectSlugValues = [
  "keeptask",
  "info4all",
  "phporto",
  "phparrot",
  "uvalab",
  "aws-terraform",
  "nextjs-tailwind-store",
  "mern",
  "mean",
  "nestauth",
] as const;
export const ProjectSlugSchema = z.enum(ProjectSlugValues);
export type ProjectSlug = z.infer<typeof ProjectSlugSchema>;

export const FlagshipSlugValues = [
  "keeptask",
  "info4all",
  "phporto",
  "phparrot",
  "uvalab",
  "aws-terraform",
] as const;
export const FlagshipSlugSchema = z.enum(FlagshipSlugValues);

export const ProjectCategorySchema = z.enum(["php", "devops-iac", "ai-agents", "typescript"]);
export const ProjectStatusSchema = z.enum(["active", "paused", "completed"]);
export const ProjectTierSchema = z.enum(["flagship", "archive"]);

export const TechTagSchema = z.enum([
  "php",
  "laravel",
  "livewire",
  "docker",
  "terraform",
  "aws",
  "wordpress",
  "nativephp",
  "python",
  "ollama",
  "typescript",
  "nodejs",
  "nextjs",
  "nestjs",
  "angular",
  "powershell",
]);

export const StackDomainSchema = z.enum(["backend", "devops-iac", "ai-agents", "frontend-legacy"]);
export const StackFocusSchema = z.enum(["primary", "secondary"]);
export const ExperienceSectionSchema = z.enum([
  "all",
  "primary",
  "earlier",
  "education",
  "certifications",
]);
export const RoleFocusSchema = z.enum(["php-laravel", "fullstack", "devops", "ai-agents"]);

export const MetaDataSchema = z
  .object({
    schema_version: z.literal("1.0.0"),
    data_version: z.string().min(1),
    last_verified_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    source_urls: z
      .object({
        en: z.url(),
        "pt-br": z.url(),
      })
      .strict(),
    locales: z.tuple([z.literal("en"), z.literal("pt-br")]),
    default_locale: z.literal("en"),
    privacy_boundary: LocalizedStringSchema,
  })
  .strict();
export type MetaData = z.infer<typeof MetaDataSchema>;

export const ProfileDataSchema = z
  .object({
    name: z.string().min(1),
    headline: LocalizedStringSchema,
    years_experience: z.string().min(1),
    timezone: z.literal("UTC-3"),
    summary: LocalizedStringSchema,
    current_focus: z.array(LocalizedStringSchema).min(1),
    availability: LocalizedStringSchema,
    story: z.array(LocalizedStringSchema).min(1),
    links: z
      .object({
        portfolio: LocalizedStringSchema,
        contact_page: LocalizedStringSchema,
        github: z.url(),
        linkedin: z.url(),
        medium: z.url(),
      })
      .strict(),
  })
  .strict();
export type ProfileData = z.infer<typeof ProfileDataSchema>;

const PrimaryRoleSchema = z
  .object({
    id: z.string().min(1),
    company: z.string().min(1),
    company_url: z.url(),
    role: LocalizedStringSchema,
    period: z.string().min(1),
    location: LocalizedStringSchema,
    summary: LocalizedStringSchema,
    stack: z.array(z.string().min(1)).min(1),
    is_tech_lead: z.boolean(),
  })
  .strict();

const EarlierRoleSchema = z
  .object({
    id: z.string().min(1),
    company: z.string().min(1),
    role: LocalizedStringSchema,
    period: z.string().min(1),
    summary: LocalizedStringSchema,
    is_tech_lead: z.boolean(),
  })
  .strict();

const EducationItemSchema = z
  .object({
    institution: LocalizedStringSchema,
    degree: LocalizedStringSchema,
    period: z.string().min(1),
    hours: z.number().int().positive().optional(),
    status: LocalizedStringSchema,
  })
  .strict();

const CertificationItemSchema = z
  .object({
    title: LocalizedStringSchema,
    issuer: z.string().min(1),
    date: z
      .string()
      .regex(/^\d{4}-\d{2}$/)
      .nullable(),
    type: z.enum(["certificate", "course"]),
    original_language: LocaleSchema,
  })
  .strict();

export const ExperienceDataSchema = z
  .object({
    primary_roles: z.array(PrimaryRoleSchema).min(1),
    earlier_roles: z.array(EarlierRoleSchema).min(1),
    education: z.array(EducationItemSchema).min(1),
    certifications: z.array(CertificationItemSchema).min(1),
  })
  .strict();
export type ExperienceData = z.infer<typeof ExperienceDataSchema>;

const ProjectMetricSchema = z
  .object({
    label: LocalizedStringSchema,
    value: z.string().min(1),
  })
  .strict();

const ProjectAdrSchema = z
  .object({
    id: z.string().min(1).optional(),
    title: LocalizedStringSchema,
    decision: LocalizedStringSchema,
  })
  .strict();

const ProjectItemSchema = z
  .object({
    slug: ProjectSlugSchema,
    title: LocalizedStringSchema,
    tier: ProjectTierSchema,
    status: ProjectStatusSchema,
    category: z.array(ProjectCategorySchema).min(1),
    year: z.string().min(1),
    type: LocalizedStringSchema,
    summary: LocalizedStringSchema,
    role_and_ownership: LocalizedStringSchema,
    problem: LocalizedStringSchema,
    solution: LocalizedStringSchema,
    metrics: z.array(ProjectMetricSchema),
    highlights: z.array(LocalizedStringSchema).min(1),
    adrs: z.array(ProjectAdrSchema),
    stack: z.array(z.string().min(1)).min(1),
    tech_tags: z.array(TechTagSchema).min(1),
    links: z
      .object({
        case_study: LocalizedStringSchema,
        repository: z.url().optional(),
        product_site: z.url().optional(),
        source_visibility: z.enum(["public", "private"]),
      })
      .strict(),
  })
  .strict();

export const ProjectsDataSchema = z
  .object({
    projects: z.array(ProjectItemSchema).length(10),
  })
  .strict();
export type ProjectsData = z.infer<typeof ProjectsDataSchema>;
export type ProjectItem = z.infer<typeof ProjectItemSchema>;

const StackItemSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    domain: StackDomainSchema,
    focus: StackFocusSchema,
    notes: LocalizedStringSchema.optional(),
    project_slugs: z.array(ProjectSlugSchema).min(1),
  })
  .strict();

export const StackDataSchema = z
  .object({
    items: z.array(StackItemSchema).min(1),
  })
  .strict();
export type StackData = z.infer<typeof StackDataSchema>;

const ArticleItemSchema = z
  .object({
    slug: z.string().min(1),
    title: LocalizedStringSchema,
    summary: LocalizedStringSchema,
    published_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    url: z.url(),
    original_language: z.literal("pt-br"),
    topics: z.array(z.string().min(1)).min(1),
  })
  .strict();

export const ArticlesDataSchema = z
  .object({
    articles: z.array(ArticleItemSchema).min(1),
  })
  .strict();
export type ArticlesData = z.infer<typeof ArticlesDataSchema>;
