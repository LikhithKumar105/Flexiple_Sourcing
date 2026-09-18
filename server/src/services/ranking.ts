import {
  CandidateScore,
  Profile,
} from "../schemas/sourcing";


export interface RankedCandidate {
  candidate_id: string;

  score: number;

  evidence:
    CandidateScore["criterion_scores"];

  explanation: string;

  profile: Profile;
}


export function rankCandidates(
  profiles: Profile[],
  scores: CandidateScore[]
): RankedCandidate[] {

  const profileMap =
    new Map(
      profiles.map(
        (profile) => [
          profile.id,
          profile,
        ]
      )
    );


  return scores
    .map((candidate) => {

      const profile =
        profileMap.get(
          candidate.candidate_id
        );


      if (!profile) {
        return null;
      }


      const criterionScores =
        candidate.criterion_scores;


      const score =
        criterionScores.length === 0
          ? 0
          : Math.round(
              criterionScores.reduce(
                (
                  sum,
                  criterion
                ) =>
                  sum +
                  criterion.score,
                0
              ) /
                criterionScores.length
            );


      return {
        candidate_id:
          candidate.candidate_id,

        score,

        evidence:
          criterionScores,

        explanation:
          candidate.explanation,

        profile,
      };
    })

    .filter(
      (
        candidate
      ): candidate is RankedCandidate =>
        candidate !== null
    )

    .sort(
      (a, b) =>
        b.score - a.score
    );
}