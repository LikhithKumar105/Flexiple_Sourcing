import { z } from "zod";

import {
  ProfileSchema,
  RubricSchema,
  SearchFiltersSchema,
} from "./sourcing";


/* =========================
   SEARCH REQUEST
========================= */

export const SearchRequestSchema =
  z.object({
    query:
      z.string()
        .trim()
        .min(1),
  });

export type SearchRequest =
  z.infer<
    typeof SearchRequestSchema
  >;


/* =========================
   SEARCH RESULT CANDIDATE
========================= */

export const SearchResultCandidateSchema =
  z.object({

    candidate_id:
      z.string(),

    score:
      z.number()
        .min(0)
        .max(100),

    evidence:
      z.array(
        z.object({

          criterion:
            z.string(),

          score:
            z.number()
              .min(0)
              .max(100),

          evidence:
            z.string(),

        })
      ),

    explanation:
      z.string(),

    profile:
      ProfileSchema,

  });


/* =========================
   SEARCH RESPONSE
========================= */

export const SearchResponseSchema =
  z.object({
    search_id:
      z.string(),

    query:
      z.string(),

    filters:
      SearchFiltersSchema,

    rubric:
      RubricSchema,

    total_profiles:
      z.number(),

    filtered_count:
      z.number(),

    candidates:
      z.array(
        SearchResultCandidateSchema
      ),

    refinement_reasoning:
      z.string()
        .optional(),

    frozen:
      z.boolean()
        .optional(),
  });


export type SearchResultCandidate =
  z.infer<
    typeof SearchResultCandidateSchema
  >;


export type SearchResponse =
  z.infer<
    typeof SearchResponseSchema
  >;

export const UpdateSearchDefinitionRequestSchema =
  z.object({
    search_id: z.string().min(1),
    filters: SearchFiltersSchema,
    rubric: RubricSchema,
  });

export type UpdateSearchDefinitionRequest =
  z.infer<
    typeof UpdateSearchDefinitionRequestSchema
  >;