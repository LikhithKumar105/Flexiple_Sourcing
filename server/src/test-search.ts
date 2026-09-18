import "dotenv/config";

import { getProfiles } from "./services/profiles";
import { generateSearchDefinition, scoreProfiles } from "./services/llm";
import { filterProfiles } from "./services/filter";
import { rankCandidates } from "./services/ranking";


async function main() {
  const query =
    "Find a senior backend engineer in Bangalore with 4-7 years of experience, RDS experience, and startup background.";


  console.log("\n================================");
  console.log("RECRUITER QUERY");
  console.log("================================\n");

  console.log(query);


  /* =========================
     LOAD PROFILES
  ========================= */

  const profiles = getProfiles();

  console.log(
    `\nLoaded ${profiles.length} profiles`
  );


  /* =========================
     LLM SEARCH GENERATION
  ========================= */

  console.log(
    "\nGenerating search definition..."
  );

  const searchDefinition =
    await generateSearchDefinition(query);


  console.log(
    "\n================================"
  );

  console.log("GENERATED FILTERS");

  console.log(
    "================================\n"
  );

  console.log(
    JSON.stringify(
      searchDefinition.filters,
      null,
      2
    )
  );


  console.log(
    "\n================================"
  );

  console.log("GENERATED RUBRIC");

  console.log(
    "================================\n"
  );

  console.log(
    JSON.stringify(
      searchDefinition.rubric,
      null,
      2
    )
  );


  /* =========================
     LOCAL FILTER
  ========================= */

  const filteredProfiles =
    filterProfiles(
      profiles,
      searchDefinition.filters
    );


  console.log(
    `\nFiltered ${profiles.length} → ${filteredProfiles.length}`
  );


  if (filteredProfiles.length === 0) {
    console.log(
      "\nNo candidates matched the objective filters."
    );

    return;
  }


  console.log(
    "\nMatching candidates:"
  );

  for (const profile of filteredProfiles) {
    console.log(
      `- ${profile.id} | ${profile.name} | ${profile.current_title}`
    );
  }


  /* =========================
     LLM SCORING
  ========================= */

  console.log(
    "\nScoring candidates..."
  );

  const scores =
    await scoreProfiles(
      filteredProfiles,
      searchDefinition.rubric
    );


  /* =========================
     DETERMINISTIC RANKING
  ========================= */

  const rankedCandidates =
    rankCandidates(
      filteredProfiles,
      scores.candidates
    );


  /* =========================
     RESULTS
  ========================= */

  console.log(
    "\n================================"
  );

  console.log("FINAL RANKING");

  console.log(
    "================================\n"
  );


  for (
    const [index, candidate]
    of rankedCandidates
      .slice(0, 5)
      .entries()
  ) {
    console.log(
      `${index + 1}. ${candidate.profile.name} — ${candidate.score}/100`
    );

    console.log(
      `   ${candidate.profile.current_title}`
    );

    console.log(
      `   ${candidate.explanation}`
    );

    console.log(
      "\n   Criterion scores:"
    );

    for (
      const criterion
      of candidate.evidence
    ) {
      console.log(
        `   • ${criterion.criterion}: ${criterion.score}/100`
      );

      console.log(
        `     Evidence: ${criterion.evidence}`
      );
    }

    console.log(
      "\n--------------------------------"
    );
  }
}


main().catch((error) => {
  console.error(
    "\nSearch test failed:"
  );

  console.error(error);

  process.exit(1);
});