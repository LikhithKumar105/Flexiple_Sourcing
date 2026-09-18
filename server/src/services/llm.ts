import OpenAI from "openai";
import {
  CandidateScores,
  CandidateScoresSchema,
  Profile,
  Rubric,
  SearchGeneration,
  SearchGenerationSchema,
  SearchFilters,
} from "../schemas/sourcing";

import {
  RefinementResult,
  RefinementResultSchema,
  CandidateFeedback,
} from "../schemas/refinement";

import {
  SEARCH_GENERATION_SYSTEM_PROMPT,
} from "../prompts/search-generation";

import {
  CANDIDATE_SCORING_SYSTEM_PROMPT,
} from "../prompts/candidate-scoring";

import {
  REFINEMENT_SYSTEM_PROMPT,
} from "../prompts/refinement";


/* =========================
   CONFIG
========================= */

const apiKey =
  process.env.OPENROUTER_API_KEY;

if (!apiKey) {
  throw new Error(
    "OPENROUTER_API_KEY is not configured"
  );
}


const client = new OpenAI({
  apiKey,

  baseURL:
    "https://openrouter.ai/api/v1",
});


const MODEL =
  "openrouter/free";


const LLM_TIMEOUT_MS =
  30_000;


/* =========================
   HELPERS
========================= */
function extractJson(content: string): string {
  let text = content.trim();

  /*
   * Remove markdown code fences if the model
   * wrapped the JSON in ```json ... ```.
   */
  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  /*
   * Find the first JSON object.
   *
   * This handles model responses such as:
   *
   * User Safety: safe
   * {
   *   "candidates": [...]
   * }
   */
  const firstObject = text.indexOf("{");

  if (firstObject === -1) {
    throw new Error(
      "LLM response does not contain a JSON object"
    );
  }

  /*
   * Find the matching closing brace while
   * respecting strings inside the JSON.
   */
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (
    let i = firstObject;
    i < text.length;
    i++
  ) {
    const char = text[i];

    if (escaped) {
      escaped = false;
      continue;
    }

    if (char === "\\") {
      if (inString) {
        escaped = true;
      }

      continue;
    }

    if (char === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (char === "{") {
      depth++;
    }

    if (char === "}") {
      depth--;

      if (depth === 0) {
        return text.slice(
          firstObject,
          i + 1
        );
      }
    }
  }

  throw new Error(
    "LLM response contains an incomplete JSON object"
  );
}


async function callLLM(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    const response =
      await client.chat.completions.create(
        {
          model: MODEL,
          temperature: 0,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: userPrompt,
            },
          ],
        },
        {
          timeout: LLM_TIMEOUT_MS,
        }
      );

    const content =
      response.choices[0]?.message?.content;

    if (!content) {
      throw new Error(
        "LLM returned an empty response"
      );
    }

    return content;
  } catch (error: any) {
    // Request timed out
    if (
      error?.name === "AbortError" ||
      error?.code === "ETIMEDOUT"
    ) {
      throw new Error(
        "LLM request timed out. Please try again."
      );
    }

    // OpenRouter/API rate limit
    if (
      error?.status === 429 ||
      error?.code === "429"
    ) {
      throw new Error(
        "LLM rate limit reached. Please wait a moment and try again."
      );
    }

    // Provider/server-side failure
    if (
      typeof error?.status === "number" &&
      error.status >= 500
    ) {
      throw new Error(
        "LLM provider is temporarily unavailable. Please try again."
      );
    }

    throw error;
  }
}


/* =========================
   SEARCH GENERATION
========================= */

export async function generateSearchDefinition(
  query: string
): Promise<SearchGeneration> {
  const userPrompt = `
Recruiter request:

${query}

Convert this request into the required JSON structure.

IMPORTANT:
- Return ONLY a JSON object.
- Do not use markdown.
- Do not use code fences.
- Do not include explanations before or after the JSON.
`;

  async function attempt(): Promise<SearchGeneration> {
    const content =
      await callLLM(
        SEARCH_GENERATION_SYSTEM_PROMPT,
        userPrompt
      );

    const parsed =
      JSON.parse(
        extractJson(content)
      );

    return SearchGenerationSchema.parse(
      parsed
    );
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.warn(
      "Search generation returned invalid output. Retrying once..."
    );

    try {
      return await attempt();
    } catch (secondError) {
      throw new Error(
        `Invalid search-generation response from LLM after retry: ${
          secondError instanceof Error
            ? secondError.message
            : "Unknown validation error"
        }`
      );
    }
  }
}


/* =========================
   CANDIDATE SCORING
========================= */
export async function scoreProfiles(
  profiles: Profile[],
  rubric: Rubric
): Promise<CandidateScores> {
  const userPrompt = `
Rubric:

${JSON.stringify(
  rubric,
  null,
  2
)}

Candidate profiles:

${JSON.stringify(
  profiles,
  null,
  2
)}

Score every candidate against every rubric criterion.

IMPORTANT:

- Evaluate every supplied candidate.
- Use only explicit evidence from the supplied profiles.
- Do not infer abilities from job titles.
- Do not infer leadership from seniority.
- Do not infer adaptability from startup experience.
- Do not infer ownership from years of experience.
- If evidence is missing, explicitly say so.
- Return exactly one result for every supplied candidate.
- Return exactly one criterion score for every rubric criterion.
- Return JSON only.
`;

  async function attempt(): Promise<CandidateScores> {
    const content =
      await callLLM(
        CANDIDATE_SCORING_SYSTEM_PROMPT,
        userPrompt
      );

    const parsed =
      JSON.parse(
        extractJson(content)
      );

    return CandidateScoresSchema.parse(
      parsed
    );
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.warn(
      "Candidate scoring returned invalid output. Retrying once..."
    );

    try {
      return await attempt();
    } catch (secondError) {
      throw new Error(
        `Invalid candidate-scoring response from LLM after retry: ${
          secondError instanceof Error
            ? secondError.message
            : "Unknown validation error"
        }`
      );
    }
  }
}
/* =========================
   REFINEMENT
========================= */

export async function refineSearchDefinition(
  query: string,
  filters: SearchFilters,
  rubric: Rubric,
  feedback: CandidateFeedback[],
  profiles: Profile[],
  message?: string
): Promise<RefinementResult> {
  const feedbackProfiles =
    feedback
      .map((item) => {
        const profile =
          profiles.find(
            (candidate) =>
              candidate.id ===
              item.candidate_id
          );

        if (!profile) {
          return null;
        }

        return {
          decision:
            item.decision,
          profile,
        };
      })
      .filter(
        (
          item
        ): item is {
          decision:
            | "yes"
            | "no";
          profile: Profile;
        } =>
          item !== null
      );

  const userPrompt = `
You are refining an existing recruiter search.

ORIGINAL REQUEST:
${query}

CURRENT FILTERS:
${JSON.stringify(filters)}

CURRENT RUBRIC:
${JSON.stringify(rubric)}

RECRUITER FEEDBACK:
${
  message?.trim()
    ? message.trim()
    : "No additional message."
}

CANDIDATE YES/NO FEEDBACK:
${JSON.stringify(feedbackProfiles)}

Update the existing filters and rubric based ONLY on the recruiter request
and explicit feedback.

IMPORTANT:
- Preserve valid existing requirements.
- YES means the recruiter liked that candidate.
- NO means the recruiter did not want that candidate.
- Do not invent reasons for YES or NO.
- Do not infer hidden preferences.
- Do not infer leadership, ownership, adaptability, autonomy, or technical
  depth from titles, years of experience, company type, or education.
- Qualitative feedback should normally modify the rubric.
- Do not add new technology skill filters unless the recruiter explicitly
  requested those technologies.
- Skills must contain only concrete technologies, databases, frameworks,
  programming languages, or tools.
- Keep 2 to 4 rubric criteria.
- Use only information supported by the supplied profiles.
- Return ONLY JSON.
- No markdown.
- No code fences.
- No explanation outside the JSON.

RETURN EXACTLY THIS STRUCTURE:

{
  "filters": {
    "skills": [],
    "min_years_experience": null,
    "max_years_experience": null,
    "location": null,
    "company_types": []
  },
  "rubric": {
    "criteria": [
      {
        "name": "criterion name",
        "description": "criterion description"
      }
    ]
  },
  "reasoning": "brief explanation of what changed"
}
`;

  async function attempt(): Promise<RefinementResult> {
    const raw =
      await callLLM(
        REFINEMENT_SYSTEM_PROMPT,
        userPrompt
      );

    const parsed =
      JSON.parse(
        extractJson(raw)
      );

    return RefinementResultSchema.parse(
      parsed
    );
  }

  try {
    return await attempt();
  } catch (firstError) {
    console.warn(
      "Search refinement returned invalid output. Retrying once..."
    );

    try {
      return await attempt();
    } catch (secondError) {
      throw new Error(
        `Invalid refinement response from LLM after retry: ${
          secondError instanceof Error
            ? secondError.message
            : "Unknown validation error"
        }`
      );
    }
  }
}