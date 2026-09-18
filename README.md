# Flexiple Sourcing — The Sourcing Refinement Loop

A recruiter-facing sourcing tool that turns a natural-language hiring request into structured search filters and a subjective candidate-fit rubric, filters a fixed candidate dataset deterministically, scores the filtered candidates with an LLM, and supports iterative refinement through recruiter feedback.

## What it does

The workflow is:

1. Recruiter enters a natural-language hiring request.
2. The server calls an LLM to generate:
   - objective filters
   - a subjective candidate-fit rubric
3. Objective filters are applied deterministically to the supplied candidate profiles.
4. Only the filtered candidates are sent to the LLM for rubric-based evaluation.
5. Candidates are ranked and the top 5 are returned.
6. The recruiter can provide YES/NO feedback and optional natural-language refinement feedback.
7. The LLM updates the search definition.
8. The server re-filters the full candidate dataset, re-scores the filtered candidates, and returns an updated shortlist.
9. The recruiter can freeze the final shortlist.

## Architecture

```text
Recruiter request
      |
      v
POST /api/search
      |
      v
LLM: filters + rubric
      |
      +----------------------+
      |                      |
      v                      v
Objective filters       Subjective rubric
      |                      |
      v                      |
Deterministic filtering     |
      |                      |
      +----------+-----------+
                 |
                 v
       Filtered candidate profiles
                 |
                 v
         LLM candidate scoring
                 |
                 v
          Ranked shortlist
                 |
                 v
      YES / NO + message feedback
                 |
                 v
       POST /api/search/refine
                 |
                 v
       Updated filters + rubric
                 |
                 v
         Re-filter + re-score
                 |
                 v
            New shortlist
                 |
                 v
               Freeze
```

## Tech stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Node.js
- Express
- TypeScript
- Zod
- OpenAI-compatible SDK

### LLM
OpenRouter is used through its OpenAI-compatible API.

The server reads the API key from:

```env
OPENROUTER_API_KEY=your_api_key_here
PORT=3001
```

The key is kept server-side in `server/.env`.

## Setup

### 1. Install dependencies

```bash
cd server
npm install

cd ../client
npm install
```

### 2. Configure environment

Create `server/.env`:

```env
OPENROUTER_API_KEY=your_api_key_here
PORT=3001
```

A template is provided as:

```text
server/.env.example
```

### 3. Start the backend

```bash
cd server
npm run dev
```

The API runs on:

```text
http://localhost:3001
```

### 4. Start the frontend

In another terminal:

```bash
cd client
npm run dev
```

Open the URL shown by Vite.

## API

### Search

```http
POST /api/search
```

Example:

```json
{
  "query": "Find a senior backend engineer in Bangalore with 4-7 years of experience, RDS experience, and startup background."
}
```

The server:
- generates filters and rubric with the LLM
- applies objective filters deterministically
- scores only the filtered candidates
- returns the top 5 candidates

### Refine

```http
POST /api/search/refine
```

Example:

```json
{
  "search_id": "search-id",
  "feedback": [
    {
      "candidate_id": "p01",
      "decision": "yes"
    },
    {
      "candidate_id": "p06",
      "decision": "no"
    }
  ],
  "message": "I want application-level backend engineers rather than database or infrastructure-focused engineers."
}
```

YES/NO feedback is treated as feedback for refining the search, not as a hard keep/remove rule. The refined search is applied again to the full candidate dataset.

### Freeze

```http
POST /api/search/freeze
```

Example:

```json
{
  "search_id": "search-id"
}
```

A frozen search cannot be refined further.

## Objective vs subjective evaluation

The implementation intentionally separates objective filtering from subjective candidate evaluation.

Objective requirements such as:
- skills
- experience range
- location
- company type

are represented as structured filters and applied deterministically.

Qualitative requirements such as:
- backend engineering depth
- application-level engineering fit
- senior-level scope

are represented as rubric criteria and evaluated by the LLM.

This prevents the LLM from deciding whether a candidate passes a deterministic requirement after seeing the profile.

## Evidence grounding

Candidate scoring is instructed to use only facts explicitly present in the supplied candidate profile.

The scoring prompt explicitly avoids unsupported assumptions such as:
- treating a senior title as proof of leadership
- treating years of experience as proof of ownership
- treating startup experience as proof of adaptability
- inferring technical expertise from education
- inventing responsibilities, achievements, or business impact

When relevant evidence is unavailable, the scorer is instructed to state that there is no explicit evidence.

## Structured LLM output

LLM output is parsed and validated with Zod before being used by the application.

The backend also handles:
- malformed JSON
- incomplete JSON responses
- empty LLM responses
- request timeouts
- rate limits
- provider-side failures

Candidate scoring, search generation, and refinement retry once when an invalid structured response is returned.

## Prompts

Prompts live in:

```text
server/src/prompts/
├── search-generation.ts
├── candidate-scoring.ts
└── refinement.ts
```

Keeping prompts in separate files makes the LLM behavior inspectable and easy to iterate on.

## Search state

Search state is stored in memory for this assignment.

Each search stores:
- original recruiter query
- current filters
- current rubric
- candidate profiles
- filtered profiles
- ranked candidates
- frozen state
- timestamps

This is intentionally simple for the assignment's fixed local dataset and timebox. A production system would use persistent storage.

## Error handling

The API distinguishes common failure modes:

- `400` — invalid request
- `404` — search not found
- `409` — search already frozen
- `429` — LLM rate limit
- `502` — malformed/invalid LLM response
- `504` — LLM timeout
- `500` — unexpected server error

## Validation

Backend build:

```bash
cd server
npm run build
```

The main workflow was manually verified through:
- initial search
- deterministic filtering
- candidate scoring
- YES/NO feedback
- natural-language refinement
- re-filtering and re-scoring
- freeze
- blocked refinement after freeze
- invalid-request handling

## Project structure

```text
flexiple-sourcing/
├── client/
├── server/
│   ├── src/
│   │   ├── data/
│   │   ├── prompts/
│   │   ├── routes/
│   │   ├── schemas/
│   │   └── services/
│   ├── .env.example
│   ├── package.json
│   └── tsconfig.json
└── README.md
```

## Design tradeoffs

### In-memory state
Chosen to keep the implementation focused on the sourcing loop instead of persistence infrastructure.

### Deterministic filtering
Objective requirements are handled on the server rather than asking the LLM to make pass/fail decisions.

### LLM rubric scoring
The LLM handles qualitative fit where profile evidence is harder to express as deterministic rules.

### Fixed candidate dataset
The supplied fictional candidate profiles are used directly; no external candidate enrichment is performed.

### Small shortlist
The API returns the top 5 candidates at a time to keep the recruiter experience focused.

## Notes

This implementation was optimized for the assignment timebox. The core design prioritizes a clear separation between objective filtering, subjective evaluation, and iterative recruiter refinement.
