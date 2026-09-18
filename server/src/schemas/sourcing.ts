import { z } from "zod";

/* =========================
   SEARCH GENERATION
========================= */

export const SearchFiltersSchema = z.object({
  skills: z.array(z.string()),
  min_years_experience: z.number().nullable(),
  max_years_experience: z.number().nullable(),
  location: z.string().nullable(),
  company_types: z.array(
    z.enum([
      "startup",
      "scaleup",
      "enterprise",
      "agency",
    ])
  ),
});

export const RubricCriterionSchema = z.object({
  name: z.string(),
  description: z.string(),
});

export const RubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema),
});

export const SearchGenerationSchema = z.object({
  filters: SearchFiltersSchema,
  rubric: RubricSchema,
});

export type SearchFilters = z.infer<
  typeof SearchFiltersSchema
>;

export type RubricCriterion = z.infer<
  typeof RubricCriterionSchema
>;

export type Rubric = z.infer<
  typeof RubricSchema
>;

export type SearchGeneration = z.infer<
  typeof SearchGenerationSchema
>;


/* =========================
   PROFILES
========================= */

export const PastCompanySchema = z.object({
  company: z.string(),
  company_type: z.enum([
    "startup",
    "scaleup",
    "enterprise",
    "agency",
  ]),
  title: z.string(),
  years: z.number(),
});

export const ProfileSchema = z.object({
  id: z.string(),

  name: z.string(),

  current_title: z.string(),

  years_experience: z.number(),

  location: z.string(),

  current_company: z.string(),

  current_company_type: z.enum([
    "startup",
    "scaleup",
    "enterprise",
    "agency",
  ]),

  skills: z.array(z.string()),

  past_companies: z.array(
    PastCompanySchema
  ),

  education: z.string(),

  summary: z.string(),
});

export type PastCompany = z.infer<
  typeof PastCompanySchema
>;

export type Profile = z.infer<
  typeof ProfileSchema
>;


/* =========================
   CANDIDATE SCORING
========================= */

export const CriterionScoreSchema = z.object({
  criterion: z.string(),

  score: z
    .number()
    .min(0)
    .max(100),

  evidence: z.string(),
});

export const CandidateScoreSchema = z.object({
  candidate_id: z.string(),

  criterion_scores: z.array(
    CriterionScoreSchema
  ),

  explanation: z.string(),
});

export const CandidateScoresSchema = z.object({
  candidates: z.array(
    CandidateScoreSchema
  ),
});

export type CriterionScore = z.infer<
  typeof CriterionScoreSchema
>;

export type CandidateScore = z.infer<
  typeof CandidateScoreSchema
>;

export type CandidateScores = z.infer<
  typeof CandidateScoresSchema
>;