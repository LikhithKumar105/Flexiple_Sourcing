import { z } from "zod";

import {
  RubricSchema,
  SearchFiltersSchema,
} from "./sourcing";

export const CandidateFeedbackSchema =
  z.object({
    candidate_id: z.string(),
    decision: z.enum([
      "yes",
      "no",
    ]),
  });

export type CandidateFeedback =
  z.infer<
    typeof CandidateFeedbackSchema
  >;

export const RefineSearchRequestSchema =
  z.object({
    search_id:
      z.string().min(1),

    feedback:
      z.array(
        CandidateFeedbackSchema
      ).min(1),

    message:
      z.string()
        .trim()
        .max(1000)
        .optional(),
  });

export type RefineSearchRequest =
  z.infer<
    typeof RefineSearchRequestSchema
  >;

export const RefinementResultSchema =
  z.object({
    filters:
      SearchFiltersSchema,

    rubric:
      RubricSchema,

    reasoning:
      z.string(),
  });

export type RefinementResult =
  z.infer<
    typeof RefinementResultSchema
  >;