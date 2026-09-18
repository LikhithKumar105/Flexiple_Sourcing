import {
  Router,
  Response,
} from "express";

import { z } from "zod";

import {
  SearchRequestSchema,
  SearchResponseSchema,
  UpdateSearchDefinitionRequestSchema
} from "../schemas/search";

import {
  RefineSearchRequestSchema,
} from "../schemas/refinement";

import {
  getProfiles,
} from "../services/profiles";

import {
  filterProfiles,
} from "../services/filter";

import {
  generateSearchDefinition,
  scoreProfiles,
  refineSearchDefinition,
} from "../services/llm";

import {
  rankCandidates,
  RankedCandidate,
} from "../services/ranking";

import {
  createSearch,
  getSearch,
  updateSearch,
} from "../services/search-store";


/* =========================
   ERROR HANDLING
========================= */

function handleRouteError(
  res: Response,
  error: unknown
) {
  if (error instanceof z.ZodError) {
    return res.status(400).json({
      error: "Invalid request",
      details: error.flatten(),
    });
  }

  const message =
    error instanceof Error
      ? error.message
      : "An unexpected error occurred.";

  if (
    message.includes("timed out")
  ) {
    return res.status(504).json({
      error: "LLM request timed out",
      message,
    });
  }

  if (
    message.includes("rate limit")
  ) {
    return res.status(429).json({
      error: "LLM rate limit reached",
      message,
    });
  }

  if (
    message.includes("Invalid") ||
    message.includes("JSON")
  ) {
    return res.status(502).json({
      error: "Invalid LLM response",
      message,
    });
  }

  return res.status(500).json({
    error: "Sourcing request failed",
    message,
  });
}


const router =
  Router();


/* =========================
   POST /api/search
========================= */

router.post(
  "/",
  async (req, res) => {

    try {

      /* -------------------------
         Validate request
      ------------------------- */

      const {
        query,
      } =
        SearchRequestSchema.parse(
          req.body
        );


      /* -------------------------
         Load profiles
      ------------------------- */

      const profiles =
        getProfiles();


      /* -------------------------
         LLM:
         query → filters + rubric
      ------------------------- */

      const searchDefinition =
        await generateSearchDefinition(
          query
        );


      /* -------------------------
         Deterministic filtering
      ------------------------- */

      const filteredProfiles =
        filterProfiles(
          profiles,
          searchDefinition.filters
        );


      /* -------------------------
         LLM scoring
      ------------------------- */

      let rankedCandidates:
        RankedCandidate[] =
        [];


      if (
        filteredProfiles.length >
        0
      ) {

        const scores =
          await scoreProfiles(
            filteredProfiles,
            searchDefinition.rubric
          );


        rankedCandidates =
          rankCandidates(
            filteredProfiles,
            scores.candidates
          );
      }


      /* -------------------------
         Save search state
      ------------------------- */

      const search =
        createSearch({

          query,

          filters:
            searchDefinition.filters,

          rubric:
            searchDefinition.rubric,

          profiles,

          filtered_profiles:
            filteredProfiles,

          candidates:
            rankedCandidates,

        });


      /* -------------------------
         API response
      ------------------------- */

      const response =
        SearchResponseSchema.parse({

          search_id:
            search.search_id,

          query,

          filters:
            search.filters,

          rubric:
            search.rubric,

          total_profiles:
            profiles.length,

          filtered_count:
            filteredProfiles.length,

          candidates:
            rankedCandidates.slice(
              0,
              5
            ),

        });


      res.json(
        response
      );

    } catch (error) {

      console.error(
        "Search error:",
        error
      );

      return handleRouteError(
        res,
        error
      );
    }
  }
);


/* =========================
   POST /api/search/refine
========================= */

router.post(
  "/refine",
  async (req, res) => {

    try {

      /* -------------------------
         Validate request
      ------------------------- */

      const {
        search_id,
        feedback,
        message,
      } =
        RefineSearchRequestSchema.parse(
          req.body
        );


      /* -------------------------
         Load search state
      ------------------------- */

      const search =
        getSearch(
          search_id
        );


      if (!search) {

        return res.status(404).json({
          error:
            "Search not found",

          message:
            "The search may have expired or the server may have restarted.",
        });
      }


      /* -------------------------
         Prevent refinement after freeze
      ------------------------- */

      if (search.frozen) {

        return res.status(409).json({
          error:
            "Search is frozen",

          message:
            "This search has been finalized and can no longer be refined.",
        });
      }


      /* -------------------------
         Validate feedback IDs
      ------------------------- */

      const validCandidateIds =
        new Set(
          search.candidates.map(
            (candidate) =>
              candidate.candidate_id
          )
        );


      const invalidFeedback =
        feedback.filter(
          (item) =>
            !validCandidateIds.has(
              item.candidate_id
            )
        );


      if (
        invalidFeedback.length >
        0
      ) {

        return res.status(400).json({
          error:
            "Invalid candidate feedback",

          message:
            "Feedback can only be provided for candidates in the current shortlist.",
        });
      }


      /* -------------------------
         LLM refinement
      ------------------------- */

      const refinement =
        await refineSearchDefinition(
          search.query,
          search.filters,
          search.rubric,
          feedback,
          search.profiles,
          message
        );


      /* -------------------------
         Re-filter
      ------------------------- */

      const filteredProfiles =
        filterProfiles(
          search.profiles,
          refinement.filters
        );


      /* -------------------------
         Re-score
      ------------------------- */

      let rankedCandidates:
        RankedCandidate[] =
        [];


      if (
        filteredProfiles.length >
        0
      ) {

        const scores =
          await scoreProfiles(
            filteredProfiles,
            refinement.rubric
          );


        rankedCandidates =
          rankCandidates(
            filteredProfiles,
            scores.candidates
          );
      }


      /* -------------------------
         Update stored state
      ------------------------- */

      const updatedSearch =
        updateSearch(
          search_id,
          {
            filters:
              refinement.filters,

            rubric:
              refinement.rubric,

            filtered_profiles:
              filteredProfiles,

            candidates:
              rankedCandidates,
          }
        );


      if (!updatedSearch) {

        return res.status(404).json({
          error:
            "Search not found",

          message:
            "The search may have expired.",
        });
      }


      /* -------------------------
         Response
      ------------------------- */

      const response =
        SearchResponseSchema.parse({

          search_id:
            updatedSearch.search_id,

          query:
            updatedSearch.query,

          filters:
            updatedSearch.filters,

          rubric:
            updatedSearch.rubric,

          total_profiles:
            updatedSearch.profiles.length,

          filtered_count:
            updatedSearch
              .filtered_profiles
              .length,

          candidates:
            updatedSearch
              .candidates
              .slice(
                0,
                5
              ),

          refinement_reasoning:
            refinement.reasoning,

        });


      res.json(
        response
      );

    } catch (error) {

      console.error(
        "Refinement error:",
        error
      );

      return handleRouteError(
        res,
        error
      );
    }
  }
);


/* =========================
   TEMPORARY GENERATION
========================= */

router.post(
  "/generate",
  async (req, res) => {

    try {

      const {
        query,
      } =
        SearchRequestSchema.parse(
          req.body
        );


      const result =
        await generateSearchDefinition(
          query
        );


      res.json(
        result
      );

    } catch (error) {

      console.error(
        "Search generation error:",
        error
      );

      return handleRouteError(
        res,
        error
      );
    }
  }
);

/* =========================
   POST /api/search/definition
========================= */

router.post(
  "/definition",
  async (req, res) => {
    try {
      const {
        search_id,
        filters,
        rubric,
      } =
        UpdateSearchDefinitionRequestSchema.parse(
          req.body
        );

      const search =
        getSearch(search_id);

      if (!search) {
        return res.status(404).json({
          error: "Search not found",
          message:
            "The search may have expired or the server may have restarted.",
        });
      }

      if (search.frozen) {
        return res.status(409).json({
          error: "Search is frozen",
          message:
            "This search has already been finalized and cannot be edited.",
        });
      }

      const filteredProfiles =
        filterProfiles(
          search.profiles,
          filters
        );

      let rankedCandidates:
        RankedCandidate[] = [];

      if (
        filteredProfiles.length > 0
      ) {
        const scores =
          await scoreProfiles(
            filteredProfiles,
            rubric
          );

        rankedCandidates =
          rankCandidates(
            filteredProfiles,
            scores.candidates
          );
      }

      const updatedSearch =
        updateSearch(
          search_id,
          {
            filters,
            rubric,
            filtered_profiles:
              filteredProfiles,
            candidates:
              rankedCandidates,
          }
        );

      if (!updatedSearch) {
        return res.status(404).json({
          error: "Search not found",
        });
      }

      const response =
        SearchResponseSchema.parse({
          search_id:
            updatedSearch.search_id,

          query:
            updatedSearch.query,

          filters:
            updatedSearch.filters,

          rubric:
            updatedSearch.rubric,

          total_profiles:
            updatedSearch.profiles.length,

          filtered_count:
            updatedSearch
              .filtered_profiles
              .length,

          candidates:
            updatedSearch.candidates.slice(
              0,
              5
            ),
        });

      return res.json(response);

    } catch (error) {
      console.error(
        "Definition update error:",
        error
      );

      return handleRouteError(
        res,
        error
      );
    }
  }
);

/* =========================
   POST /api/search/freeze
========================= */

router.post(
  "/freeze",
  async (req, res) => {

    try {

      /* -------------------------
         Validate request
      ------------------------- */

      const parsed =
        z.object({
          search_id:
            z.string().min(1),
        }).safeParse(
          req.body
        );


      if (!parsed.success) {

        return res.status(400).json({
          error:
            "Invalid request",

          details:
            parsed.error.flatten(),
        });
      }


      /* -------------------------
         Load search
      ------------------------- */

      const search =
        getSearch(
          parsed.data.search_id
        );


      if (!search) {

        return res.status(404).json({
          error:
            "Search not found",

          message:
            "The search may have expired or the server may have restarted.",
        });
      }


      /* -------------------------
         Prevent double freeze
      ------------------------- */

      if (search.frozen) {

        return res.status(409).json({
          error:
            "Search already frozen",

          message:
            "This search has already been finalized.",
        });
      }


      /* -------------------------
         Freeze search
      ------------------------- */

      const frozenSearch =
        updateSearch(
          search.search_id,
          {
            frozen: true,
          }
        );


      if (!frozenSearch) {

        return res.status(404).json({
          error:
            "Search not found",
        });
      }


      /* -------------------------
         Final response
      ------------------------- */

      return res.json({

        search_id:
          frozenSearch.search_id,

        query:
          frozenSearch.query,

        filters:
          frozenSearch.filters,

        rubric:
          frozenSearch.rubric,

        total_profiles:
          frozenSearch.profiles.length,

        filtered_count:
          frozenSearch
            .filtered_profiles
            .length,

        candidates:
          frozenSearch
            .candidates
            .slice(
              0,
              5
            ),

        frozen:
          true,
      });

    } catch (error) {

      console.error(
        "Freeze error:",
        error
      );

      return handleRouteError(
        res,
        error
      );
    }
  }
);


/* =========================
   EXPORT
========================= */

export default router;