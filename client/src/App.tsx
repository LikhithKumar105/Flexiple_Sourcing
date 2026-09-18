import { useState } from "react";
import "./App.css";

type CompanyType =
  | "startup"
  | "scaleup"
  | "enterprise"
  | "agency";

type SearchFilters = {
  skills: string[];
  min_years_experience: number | null;
  max_years_experience: number | null;
  location: string | null;
  company_types: CompanyType[];
};

type RubricCriterion = {
  name: string;
  description: string;
};

type Rubric = {
  criteria: RubricCriterion[];
};

type Profile = {
  id: string;
  name: string;
  current_title: string;
  years_experience: number;
  location: string;
  current_company: string;
  current_company_type: CompanyType;
  skills: string[];
  past_companies: {
    company: string;
    company_type: CompanyType;
    title: string;
    years: number;
  }[];
  education: string;
  summary: string;
};

type CriterionScore = {
  criterion: string;
  score: number;
  evidence: string;
};

type Candidate = {
  candidate_id: string;
  score: number;
  evidence: CriterionScore[];
  explanation: string;
  profile: Profile;
};

type SearchResponse = {
  search_id: string;
  query: string;
  filters: SearchFilters;
  rubric: Rubric;
  total_profiles: number;
  filtered_count: number;
  candidates: Candidate[];
  refinement_reasoning?: string;
  frozen?: boolean;
};

type Feedback = {
  candidate_id: string;
  decision: "yes" | "no";
};

const API_URL = "http://localhost:3001";

function App() {
  const [query, setQuery] = useState("");

  const [search, setSearch] =
    useState<SearchResponse | null>(null);

  const [feedback, setFeedback] =
    useState<Record<string, "yes" | "no">>({});

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [refinementMessage, setRefinementMessage] =
    useState("");

  const [refining, setRefining] =
    useState(false);

  const [freezing, setFreezing] =
    useState(false);

  const [editingDefinition, setEditingDefinition] =
    useState(false);

  const [editedFilters, setEditedFilters] =
    useState<SearchFilters | null>(null);

  const [editedRubric, setEditedRubric] =
    useState<Rubric | null>(null);

  const [savingDefinition, setSavingDefinition] =
    useState(false);
  
  async function saveDefinition() {
    if (
      !search ||
      !editedFilters ||
      !editedRubric ||
      search.frozen
    ) {
      return;
    }

    setSavingDefinition(true);
    setError(null);

    try {
      const response =
        await fetch(
          `${API_URL}/api/search/definition`,
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              search_id:
                search.search_id,
              filters:
                editedFilters,
              rubric:
                editedRubric,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to update search"
        );
      }

      setSearch(data);
      setEditingDefinition(false);
      setEditedFilters(null);
      setEditedRubric(null);
      setFeedback({});

    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to update search"
      );
    } finally {
      setSavingDefinition(false);
    }
  }

  async function runSearch() {
    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError(null);
    setSearch(null);
    setFeedback({});
    setRefinementMessage("");

    try {
      const response = await fetch(
        `${API_URL}/api/search`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            query: query.trim(),
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Search failed"
        );
      }

      setSearch(data);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong"
      );
    } finally {
      setLoading(false);
    }
  }

  function setCandidateFeedback(
    candidateId: string,
    decision: "yes" | "no"
  ) {
    if (search?.frozen) {
      return;
    }

    setFeedback((current) => ({
      ...current,
      [candidateId]: decision,
    }));
  }

  async function refineSearch() {
    if (!search || search.frozen) {
      return;
    }

    const selectedFeedback: Feedback[] =
      Object.entries(feedback).map(
        ([candidate_id, decision]) => ({
          candidate_id,
          decision,
        })
      );

    if (selectedFeedback.length === 0) {
      setError(
        "Mark at least one candidate YES or NO before refining."
      );
      return;
    }

    setRefining(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/search/refine`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            search_id:
              search.search_id,
            feedback:
              selectedFeedback,
            message:
              refinementMessage.trim() ||
              undefined,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Refinement failed"
        );
      }

      setSearch(data);
      setFeedback({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Refinement failed"
      );
    } finally {
      setRefining(false);
    }
  }

  async function freezeSearch() {
    if (!search || search.frozen) {
      return;
    }

    setFreezing(true);
    setError(null);

    try {
      const response = await fetch(
        `${API_URL}/api/search/freeze`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            search_id:
              search.search_id,
          }),
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
            data.error ||
            "Failed to freeze search"
        );
      }

      setSearch(data);
      setFeedback({});
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to freeze search"
      );
    } finally {
      setFreezing(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            S
          </div>

          <div>
            <div className="brand-name">
              Sourcing Loop
            </div>

            <div className="brand-subtitle">
              AI-assisted candidate sourcing
            </div>
          </div>
        </div>

        {search && (
          <div
            className={`status-pill ${
              search.frozen
                ? "status-frozen"
                : "status-active"
            }`}
          >
            <span className="status-dot" />
            {search.frozen
              ? "Search frozen"
              : "Search active"}
          </div>
        )}
      </header>

      <main className="main-content">
        {!search && (
          <section className="hero-section">
            <div className="eyebrow">
              RECRUITER SOURCING
            </div>

            <h1>
              Find the right
              <br />
              candidates faster.
            </h1>

            <p className="hero-copy">
              Describe the role in your own words.
              AI converts your request into objective
              filters and a candidate-fit rubric,
              then continuously refines the shortlist
              from your feedback.
            </p>
          </section>
        )}

        <section
          className={`search-panel ${
            search
              ? "search-panel-compact"
              : ""
          }`}
        >
          <div className="search-input-wrap">
            <div className="search-icon">
              ⌕
            </div>

            <input
              value={query}
              onChange={(event) =>
                setQuery(
                  event.target.value
                )
              }
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !loading
                ) {
                  runSearch();
                }
              }}
              placeholder="Describe the candidate you're looking for..."
              disabled={
                loading || refining
              }
            />

            <button
              className="search-button"
              onClick={runSearch}
              disabled={
                loading ||
                !query.trim()
              }
            >
              {loading
                ? "Searching..."
                : "Search"}
            </button>
          </div>

          {!search && (
            <div className="example-query">
              <span>Try:</span>

              <button
                onClick={() =>
                  setQuery(
                    "Find a senior backend engineer in Bangalore with 4-7 years of experience, RDS experience, and startup background."
                  )
                }
              >
                Senior backend engineer in Bangalore
              </button>

              <button
                onClick={() =>
                  setQuery(
                    "Find a Python engineer with startup experience and strong database skills."
                  )
                }
              >
                Python engineer with startup experience
              </button>
            </div>
          )}
        </section>

        {error && (
          <div className="error-banner">
            <span className="error-icon">
              !
            </span>

            <span>{error}</span>

            <button
              onClick={() =>
                setError(null)
              }
            >
              ×
            </button>
          </div>
        )}

        {loading && (
          <LoadingState
            label="Understanding the hiring request and evaluating candidates..."
          />
        )}

        {search && !loading && (
          <>
            <SearchSummary
              search={search}
              editingDefinition={
                editingDefinition
              }
              editedFilters={
                editedFilters
              }
              editedRubric={
                editedRubric
              }
              savingDefinition={
                savingDefinition
              }
              onStartEditing={() => {
                setEditedFilters(
                  structuredClone(search.filters)
                );

                setEditedRubric(
                  structuredClone(search.rubric)
                );

                setEditingDefinition(true);
              }}
              onCancelEditing={() => {
                setEditingDefinition(false);
                setEditedFilters(null);
                setEditedRubric(null);
              }}
              onSaveDefinition={
                saveDefinition
              }
              onFiltersChange={
                setEditedFilters
              }
              onRubricChange={
                setEditedRubric
              }
            />

            {search.refinement_reasoning && (
              <section className="reasoning-card">
                <div className="section-label">
                  REFINEMENT APPLIED
                </div>

                <p>
                  {search.refinement_reasoning}
                </p>
              </section>
            )}

            <section className="workspace">
              <div className="workspace-header">
                <div>
                  <div className="section-label">
                    CANDIDATE SHORTLIST
                  </div>

                  <h2>
                    {search.filtered_count}{" "}
                    matching{" "}
                    {search.filtered_count === 1
                      ? "candidate"
                      : "candidates"}
                  </h2>
                </div>

                {!search.frozen && (
                  <button
                    className="freeze-button"
                    onClick={freezeSearch}
                    disabled={freezing}
                  >
                    {freezing
                      ? "Freezing..."
                      : "Freeze shortlist"}
                  </button>
                )}

                {search.frozen && (
                  <div className="frozen-badge">
                    ✓ Final shortlist
                  </div>
                )}
              </div>

              {search.candidates.length ===
              0 ? (
                <EmptyState />
              ) : (
                <div className="candidate-list">
                  {search.candidates.map(
                    (candidate) => (
                      <CandidateCard
                        key={
                          candidate.candidate_id
                        }
                        candidate={
                          candidate
                        }
                        decision={
                          feedback[
                            candidate
                              .candidate_id
                          ]
                        }
                        frozen={
                          Boolean(
                            search.frozen
                          )
                        }
                        onFeedback={
                          setCandidateFeedback
                        }
                      />
                    )
                  )}
                </div>
              )}
            </section>

            {!search.frozen &&
              search.candidates.length >
                0 && (
                <section className="refinement-panel">
                  <div className="refinement-header">
                    <div>
                      <div className="section-label">
                        REFINE
                      </div>

                      <h2>
                        Shape the shortlist
                      </h2>

                      <p>
                        Mark candidates as
                        YES or NO. The AI will
                        use your feedback to
                        refine the search.
                      </p>
                    </div>

                    <div className="feedback-count">
                      {
                        Object.keys(
                          feedback
                        ).length
                      }{" "}
                      selected
                    </div>
                  </div>

                  <textarea
                    value={
                      refinementMessage
                    }
                    onChange={(event) =>
                      setRefinementMessage(
                        event.target.value
                      )
                    }
                    placeholder="Optional: tell the AI what you want to change about the shortlist..."
                    disabled={refining}
                  />

                  <div className="refinement-actions">
                    <span>
                      Feedback is applied to
                      both filtering and
                      candidate-fit evaluation.
                    </span>

                    <button
                      className="refine-button"
                      onClick={
                        refineSearch
                      }
                      disabled={
                        refining ||
                        Object.keys(
                          feedback
                        ).length === 0
                      }
                    >
                      {refining
                        ? "Refining..."
                        : "Refine shortlist →"}
                    </button>
                  </div>
                </section>
              )}
          </>
        )}
      </main>

      <footer className="footer">
        <span>
          Sourcing Refinement Loop
        </span>

        <span>
          Objective filters + subjective fit
        </span>
      </footer>
    </div>
  );
}

function SearchSummary({
  search,
  editingDefinition,
  editedFilters,
  editedRubric,
  savingDefinition,
  onStartEditing,
  onCancelEditing,
  onSaveDefinition,
  onFiltersChange,
  onRubricChange,
}: {
  search: SearchResponse;
  editingDefinition: boolean;
  editedFilters: SearchFilters | null;
  editedRubric: Rubric | null;
  savingDefinition: boolean;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveDefinition: () => void;
  onFiltersChange: (
    filters: SearchFilters
  ) => void;
  onRubricChange: (
    rubric: Rubric
  ) => void;
}) {
  const filters =
    editedFilters ?? search.filters;

  const rubric =
    editedRubric ?? search.rubric;

  function updateSkill(
    index: number,
    value: string
  ) {
    onFiltersChange({
      ...filters,
      skills: filters.skills.map(
        (skill, skillIndex) =>
          skillIndex === index
            ? value
            : skill
      ),
    });
  }

  function removeSkill(index: number) {
    onFiltersChange({
      ...filters,
      skills: filters.skills.filter(
        (_, skillIndex) =>
          skillIndex !== index
      ),
    });
  }

  function addSkill() {
    onFiltersChange({
      ...filters,
      skills: [
        ...filters.skills,
        "",
      ],
    });
  }

  function updateCriterion(
    index: number,
    field: "name" | "description",
    value: string
  ) {
    onRubricChange({
      criteria:
        rubric.criteria.map(
          (criterion, criterionIndex) =>
            criterionIndex === index
              ? {
                  ...criterion,
                  [field]: value,
                }
              : criterion
        ),
    });
  }

  function removeCriterion(
    index: number
  ) {
    onRubricChange({
      criteria:
        rubric.criteria.filter(
          (_, criterionIndex) =>
            criterionIndex !== index
        ),
    });
  }

  function addCriterion() {
    if (
      rubric.criteria.length >= 4
    ) {
      return;
    }

    onRubricChange({
      criteria: [
        ...rubric.criteria,
        {
          name: "",
          description: "",
        },
      ],
    });
  }

  return (
    <section className="search-summary">
      <div className="summary-main">
        <div className="section-label">
          SEARCH DEFINITION
        </div>

        <p className="query-text">
          “{search.query}”
        </p>
      </div>

      <div className="summary-stats">
        <div>
          <strong>
            {search.total_profiles}
          </strong>
          <span>profiles</span>
        </div>

        <div>
          <strong>
            {search.filtered_count}
          </strong>
          <span>matched</span>
        </div>
      </div>

      <div className="definition-grid">

        {/* OBJECTIVE FILTERS */}

        <div className="definition-card">
          <div className="card-heading">
            <span>
              Objective filters
            </span>

            {!search.frozen &&
              !editingDefinition && (
                <button
                  className="edit-definition-button"
                  onClick={
                    onStartEditing
                  }
                >
                  Edit
                </button>
              )}
          </div>

          {!editingDefinition ? (
            <div className="chips">

              {search.filters.skills.map(
                (skill) => (
                  <span
                    className="chip"
                    key={skill}
                  >
                    {skill}
                  </span>
                )
              )}

              {search.filters
                .min_years_experience !==
                null && (
                <span className="chip">
                  {
                    search.filters
                      .min_years_experience
                  }
                  –
                  {search.filters
                    .max_years_experience ??
                    "∞"}{" "}
                  yrs
                </span>
              )}

              {search.filters
                .location && (
                <span className="chip">
                  {
                    search.filters
                      .location
                  }
                </span>
              )}

              {search.filters
                .company_types.map(
                  (type) => (
                    <span
                      className="chip"
                      key={type}
                    >
                      {type}
                    </span>
                  )
                )}

              {search.filters.skills
                .length === 0 &&
                search.filters.location ===
                  null &&
                search.filters
                  .min_years_experience ===
                  null &&
                search.filters
                  .company_types
                  .length === 0 && (
                  <span className="muted">
                    No objective filters
                  </span>
                )}
            </div>
          ) : (
            <div className="definition-editor">

              <label>
                Skills
              </label>

              {filters.skills.map(
                (skill, index) => (
                  <div
                    className="editor-row"
                    key={index}
                  >
                    <input
                      value={skill}
                      onChange={(event) =>
                        updateSkill(
                          index,
                          event.target.value
                        )
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        removeSkill(index)
                      }
                    >
                      ×
                    </button>
                  </div>
                )
              )}

              <button
                type="button"
                className="editor-add"
                onClick={addSkill}
              >
                + Add skill
              </button>

              <label>
                Experience
              </label>

              <div className="editor-inline">
                <input
                  type="number"
                  placeholder="Min"
                  value={
                    filters
                      .min_years_experience ??
                    ""
                  }
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      min_years_experience:
                        event.target.value
                          ? Number(
                              event.target.value
                            )
                          : null,
                    })
                  }
                />

                <span>to</span>

                <input
                  type="number"
                  placeholder="Max"
                  value={
                    filters
                      .max_years_experience ??
                    ""
                  }
                  onChange={(event) =>
                    onFiltersChange({
                      ...filters,
                      max_years_experience:
                        event.target.value
                          ? Number(
                              event.target.value
                            )
                          : null,
                    })
                  }
                />
              </div>

              <label>
                Location
              </label>

              <input
                value={
                  filters.location ?? ""
                }
                placeholder="Any location"
                onChange={(event) =>
                  onFiltersChange({
                    ...filters,
                    location:
                      event.target.value
                        .trim() ||
                      null,
                  })
                }
              />

              <label>
                Company types
              </label>

              <div className="company-type-editor">
                {(
                  [
                    "startup",
                    "scaleup",
                    "enterprise",
                    "agency",
                  ] as CompanyType[]
                ).map((type) => (
                  <label
                    key={type}
                    className="checkbox-option"
                  >
                    <input
                      type="checkbox"
                      checked={filters.company_types.includes(
                        type
                      )}
                      onChange={() => {
                        const exists =
                          filters.company_types.includes(
                            type
                          );

                        onFiltersChange({
                          ...filters,
                          company_types:
                            exists
                              ? filters.company_types.filter(
                                  (item) =>
                                    item !==
                                    type
                                )
                              : [
                                  ...filters.company_types,
                                  type,
                                ],
                        });
                      }}
                    />

                    {type}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* RUBRIC */}

        <div className="definition-card">
          <div className="card-heading">
            <span>
              Candidate-fit rubric
            </span>
          </div>

          {!editingDefinition ? (
            <div className="rubric-list">
              {search.rubric.criteria.map(
                (criterion) => (
                  <div
                    className="rubric-item"
                    key={criterion.name}
                  >
                    <strong>
                      {criterion.name}
                    </strong>

                    <span>
                      {
                        criterion.description
                      }
                    </span>
                  </div>
                )
              )}
            </div>
          ) : (
            <div className="definition-editor">

              {rubric.criteria.map(
                (criterion, index) => (
                  <div
                    className="rubric-editor-item"
                    key={index}
                  >
                    <div className="editor-row">
                      <input
                        value={
                          criterion.name
                        }
                        placeholder="Criterion name"
                        onChange={(event) =>
                          updateCriterion(
                            index,
                            "name",
                            event.target.value
                          )
                        }
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeCriterion(
                            index
                          )
                        }
                      >
                        ×
                      </button>
                    </div>

                    <textarea
                      value={
                        criterion.description
                      }
                      placeholder="What explicit evidence should be evaluated?"
                      onChange={(event) =>
                        updateCriterion(
                          index,
                          "description",
                          event.target.value
                        )
                      }
                    />
                  </div>
                )
              )}

              {rubric.criteria.length <
                4 && (
                <button
                  type="button"
                  className="editor-add"
                  onClick={addCriterion}
                >
                  + Add criterion
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {editingDefinition && (
        <div className="definition-actions">
          <button
            type="button"
            className="cancel-definition-button"
            onClick={
              onCancelEditing
            }
            disabled={
              savingDefinition
            }
          >
            Cancel
          </button>

          <button
            type="button"
            className="apply-definition-button"
            onClick={
              onSaveDefinition
            }
            disabled={
              savingDefinition
            }
          >
            {savingDefinition
              ? "Applying..."
              : "Apply changes →"}
          </button>
        </div>
      )}
    </section>
  );
}

function CandidateCard({
  candidate,
  decision,
  frozen,
  onFeedback,
}: {
  candidate: Candidate;
  decision?: "yes" | "no";
  frozen: boolean;
  onFeedback: (
    candidateId: string,
    decision: "yes" | "no"
  ) => void;
}) {
  return (
    <article className="candidate-card">
      <div className="candidate-top">
        <div className="candidate-identity">
          <div className="avatar">
            {candidate.profile.name
              .split(" ")
              .map((part) =>
                part[0]
              )
              .join("")
              .slice(0, 2)}
          </div>

          <div>
            <h3>
              {candidate.profile.name}
            </h3>

            <p>
              {
                candidate.profile
                  .current_title
              }
            </p>
          </div>
        </div>

        <div className="candidate-score">
          <strong>
            {candidate.score}
          </strong>

          <span>FIT</span>
        </div>
      </div>

      <div className="candidate-meta">
        <span>
          ◷{" "}
          {
            candidate.profile
              .years_experience
          }{" "}
          years
        </span>

        <span>
          ⌖ {candidate.profile.location}
        </span>

        <span>
          {candidate.profile
            .current_company}
        </span>

        <span className="company-type">
          {
            candidate.profile
              .current_company_type
          }
        </span>
      </div>

      <p className="candidate-summary">
        {candidate.profile.summary}
      </p>

      <div className="candidate-skills">
        {candidate.profile.skills.map(
          (skill) => (
            <span
              key={skill}
              className="skill-tag"
            >
              {skill}
            </span>
          )
        )}
      </div>

      <div className="evidence-section">
        <div className="evidence-heading">
          Evidence
        </div>

        {candidate.evidence.map(
          (item) => (
            <div
              className="evidence-row"
              key={item.criterion}
            >
              <div className="evidence-score">
                <span>
                  {item.score}
                </span>
              </div>

              <div>
                <strong>
                  {item.criterion}
                </strong>

                <p>
                  {item.evidence}
                </p>
              </div>
            </div>
          )
        )}
      </div>

      <div className="candidate-explanation">
        <span>AI assessment</span>
        <p>
          {candidate.explanation}
        </p>
      </div>

      {!frozen && (
        <div className="decision-row">
          <span>
            Recruiter feedback
          </span>

          <div className="decision-buttons">
            <button
              className={
                decision === "yes"
                  ? "decision yes selected"
                  : "decision yes"
              }
              onClick={() =>
                onFeedback(
                  candidate.candidate_id,
                  "yes"
                )
              }
            >
              ✓ YES
            </button>

            <button
              className={
                decision === "no"
                  ? "decision no selected"
                  : "decision no"
              }
              onClick={() =>
                onFeedback(
                  candidate.candidate_id,
                  "no"
                )
              }
            >
              × NO
            </button>
          </div>
        </div>
      )}

      {frozen && (
        <div className="finalized-row">
          ✓ Included in final frozen shortlist
        </div>
      )}
    </article>
  );
}

function LoadingState({
  label,
}: {
  label: string;
}) {
  return (
    <div className="loading-state">
      <div className="loading-spinner" />

      <div>
        <strong>
          Working on your search
        </strong>

        <p>{label}</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        ∅
      </div>

      <h3>
        No candidates matched
      </h3>

      <p>
        Try broadening the experience,
        location, skills, or company
        requirements.
      </p>
    </div>
  );
}

export default App;