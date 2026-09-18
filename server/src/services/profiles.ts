import profilesData from "../data/profiles.json";

import {
  Profile,
  ProfileSchema,
} from "../schemas/sourcing";


export function getProfiles(): Profile[] {
  return profilesData.map(
    (profile) =>
      ProfileSchema.parse(profile)
  );
}