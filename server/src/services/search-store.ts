import {
  Profile,
  Rubric,
  SearchFilters,
} from "../schemas/sourcing";

import {
  RankedCandidate,
} from "./ranking";

export interface SearchState {
  search_id: string;
  query: string;
  filters: SearchFilters;
  rubric: Rubric;
  profiles: Profile[];
  filtered_profiles: Profile[];
  candidates: RankedCandidate[];
  frozen: boolean;
  created_at: number;
  updated_at: number;
}

const searches =
  new Map<string, SearchState>();

function generateSearchId(): string {
  return `${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 10)}`;
}

export function createSearch(
  state: Omit<
    SearchState,
    "search_id" |
    "created_at" |
    "updated_at" |
    "frozen"
  >
): SearchState {
  const search_id =
    generateSearchId();

  const now =
    Date.now();

  const search: SearchState = {
    ...state,
    frozen: false,
    search_id,
    created_at: now,
    updated_at: now,
  };

  searches.set(
    search_id,
    search
  );

  return search;
}

export function getSearch(
  searchId: string
): SearchState | undefined {
  return searches.get(
    searchId
  );
}

export function updateSearch(
  searchId: string,
  updates: Partial<
    Omit<
      SearchState,
      "search_id" |
      "created_at"
    >
  >
): SearchState | undefined {
  const existing =
    searches.get(searchId);

  if (!existing) {
    return undefined;
  }

  const updated: SearchState = {
    ...existing,
    ...updates,
    updated_at: Date.now(),
  };

  searches.set(
    searchId,
    updated
  );

  return updated;
}

export function deleteSearch(
  searchId: string
): boolean {
  return searches.delete(
    searchId
  );
}