import {
  Profile,
  SearchFilters,
} from "../schemas/sourcing";


function normalize(
  value: string
): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[._-]/g, " ")
    .replace(/\s+/g, " ");
}


function skillMatches(
  profileSkill: string,
  requestedSkill: string
): boolean {
  const profileValue =
    normalize(profileSkill);

  const requestedValue =
    normalize(requestedSkill);

  return (
    profileValue === requestedValue ||
    profileValue.includes(requestedValue) ||
    requestedValue.includes(profileValue)
  );
}


function companyTypeMatches(
  profile: Profile,
  requestedTypes: SearchFilters["company_types"]
): boolean {
  /*
   * No company-type requirement means
   * every company type is acceptable.
   */

  if (requestedTypes.length === 0) {
    return true;
  }


  /*
   * Current company
   */

  if (
    requestedTypes.includes(
      profile.current_company_type
    )
  ) {
    return true;
  }


  /*
   * Previous companies
   */

  return profile.past_companies.some(
    (company) =>
      requestedTypes.includes(
        company.company_type
      )
  );
}


export function filterProfiles(
  profiles: Profile[],
  filters: SearchFilters
): Profile[] {
  return profiles.filter(
    (profile) => {

      /* =========================
         EXPERIENCE
      ========================= */

      if (
        filters.min_years_experience !==
          null &&
        profile.years_experience <
          filters.min_years_experience
      ) {
        return false;
      }


      if (
        filters.max_years_experience !==
          null &&
        profile.years_experience >
          filters.max_years_experience
      ) {
        return false;
      }


      /* =========================
         LOCATION
      ========================= */

      if (
        filters.location !== null &&
        normalize(profile.location) !==
          normalize(filters.location)
      ) {
        return false;
      }


      /* =========================
         SKILLS
      ========================= */

      if (
        filters.skills.length > 0
      ) {
        const hasAllSkills =
          filters.skills.every(
            (requestedSkill) =>
              profile.skills.some(
                (profileSkill) =>
                  skillMatches(
                    profileSkill,
                    requestedSkill
                  )
              )
          );

        if (!hasAllSkills) {
          return false;
        }
      }


      /* =========================
         COMPANY TYPE
      ========================= */

      if (
        !companyTypeMatches(
          profile,
          filters.company_types
        )
      ) {
        return false;
      }


      return true;
    }
  );
}