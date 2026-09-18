import "dotenv/config";

import { getProfiles } from "./services/profiles";
import { filterProfiles } from "./services/filter";
import { scoreProfiles } from "./services/llm";
import { rankCandidates } from "./services/ranking";
import {
  RubricSchema,
  SearchFiltersSchema,
} from "./schemas/sourcing";

async function main() {
  const profiles = getProfiles();

  const filters = SearchFiltersSchema.parse({
    skills: ["RDS"],
    min_years_experience: 4,
    max_years_experience: 7,
    location: "Bangalore",
    company_types: ["startup"],
  });

  const rubric = RubricSchema.parse({
    criteria: [
      {
        name: "Problem-Solving",
        description:
          "Evidence of solving technical or database problems, debugging, or handling production issues.",
      },
      {
        name: "Startup Experience",
        description:
          "Evidence of working effectively in an early-stage or fast-moving startup environment.",
      },
      {
        name: "Backend Engineering",
        description:
          "Evidence of hands-on backend engineering using relevant technologies.",
      },
    ],
  });

  const filteredProfiles = filterProfiles(
    profiles,
    filters
  );

  console.log(
    `Filtered ${profiles.length} profiles down to ${filteredProfiles.length}`
  );

  const scores = await scoreProfiles(
    filteredProfiles,
    rubric
  );

  const rankedCandidates = rankCandidates(
    filteredProfiles,
    scores.candidates
  );

  console.log("\n=== RANKED CANDIDATES ===\n");

  for (const candidate of rankedCandidates) {
    console.log(
      `${candidate.profile.name} (${candidate.candidate_id})`
    );

    console.log(`Final score: ${candidate.score}`);

    console.log(
      `Explanation: ${candidate.explanation}`
    );

    console.log("Criterion scores:");

    for (const criterion of candidate.evidence) {
      console.log(
        `  ${criterion.criterion}: ${criterion.score}`
      );

      console.log(
        `  Evidence: ${criterion.evidence}`
      );
    }

    console.log("\n----------------------\n");
  }
}

main().catch((error) => {
  console.error("Test failed:", error);
  process.exit(1);
});