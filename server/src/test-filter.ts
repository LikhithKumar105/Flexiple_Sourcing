import "dotenv/config";

import { getProfiles } from "./services/profiles";
import { filterProfiles } from "./services/filter";
import { SearchFiltersSchema } from "./schemas/sourcing";

const profiles = getProfiles();

const filters = SearchFiltersSchema.parse({
  skills: ["RDS"],
  min_years_experience: 4,
  max_years_experience: 7,
  location: "Bangalore",
  company_types: ["startup"],
});

const matches = filterProfiles(profiles, filters);

console.log(`Total profiles: ${profiles.length}`);
console.log(`Matching profiles: ${matches.length}`);

for (const profile of matches) {
  console.log(
    `${profile.id} ${profile.name} | ${profile.years_experience} years | ${profile.location} | ${profile.current_company}`
  );
}