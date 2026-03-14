# Chat Implementation Notes

## Goal

Support a broad variety of user questions in Chat by routing prompts to the correct WikiTree API and/or WikiTree+ calls, then normalizing results into answer-ready data.

## Implemented So Far

- Added an intent router skeleton in `chat_router.js`:

  - classifies prompt into intent families before execution.
  - currently routes: CC7 location filters (born/died/generic in-location), granduncles count, connection lookup, profile search, last-result operations, and AI fallback.
  - keeps prompt classification logic isolated from transport/UI code in `chat.js`.

- Structured result sets can now be refined in-chat without repeating the underlying WikiTree query:

  - open the last result in a DataTable.
  - count the current rows.
  - group/count by fields such as surname or country.
  - sort by fields such as name, birth date, death date, degree, or country.
  - filter by gender, surname, birth/death location, country, or generic text match.

- CC7 birth-location intent now uses `WikiTreeAPI.getPeople(...)` with the same paged strategy as CC7 Changes:
  - `nuclear: 7`
  - `start` + `limit` paging
  - continue while status indicates max profile cap was hit.
- Chat keeps a short in-memory CC7 cache to avoid repeated full CC7 fetches for follow-up location/count questions.
- If CC7 API retrieval fails, Chat falls back to the visible CC7 table (when present) as a best-effort source.

## Integration Constraints (Important)

### 1. WikiTree+ calls returning numeric profile IDs only

Some WikiTree+ endpoints return JSON where the main result is a list/array of numeric profile IDs.

Required follow-up:

1. Take returned numeric IDs from WikiTree+.
2. Batch them through `WikiTreeAPI.getPeople(...)`.
3. Request only required fields for the question type (for example `Id,Name,BirthLocation,DeathLocation,Gender,Derived.ShortName`).
4. Perform filtering/aggregation on the enriched profile objects.

Implementation consequence:

- Query execution is often a two-step pipeline: `WT+ search -> getPeople enrichment -> answer logic`.

### 2. WikiTree+ calls returning HTML tables instead of structured JSON rows

Some calls/pages provide an HTML table (often top N rows, e.g. 10 profiles) rather than clean JSON rows.

Required follow-up:

1. Parse HTML table safely in code (no brittle regex-only parsing).
2. Extract profile identifiers/links, names, and any useful columns.
3. Normalize extracted rows into a typed internal shape.
4. If IDs are present or can be derived, optionally call `getPeople` for fuller data.

Implementation consequence:

- Chat needs an HTML parsing adapter layer in addition to JSON adapters.

## WikiTree API Notes (from docs)

### Core action behavior to design around

- `getPeople` is the primary multi-profile workhorse for Chat because it supports batching and relationship expansion (`ancestors`, `descendants`, `nuclear`, `siblings`).
- `getPeople` returns both `resultByKey` (mapping requested keys to IDs/status) and `people` (records keyed by numeric ID). Chat should validate both layers.
- With `getPeople`, `fields` cannot directly request `Parents`, `Children`, `Siblings` as profile fields; use relationship options (`nuclear`, `ancestors`, `descendants`, `siblings`) to pull those related people.
- Key limits matter for batching:
  - max 100 keys when any of `ancestors`/`descendants`/`nuclear` is used.
  - otherwise max 1000 keys.
- `start` and `limit` pagination applies to related profiles gathered via relationship expansion. For large CC7-style traversals, iterative paging is required.

### Connection and relationship specifics

- `getConnections` requires `appId`; without it, the API returns an error.
- `getConnections` supports useful parameters for Chat intent routing:
  - `relation` to constrain path type (shortest, ancestor-based, etc.)
  - `ignoreIds` for alternate-path retries
  - `nopath=1` when only distance/pathLength is needed.
- Connection responses can include private/unviewable nodes (negative IDs in path). Chat should explain this clearly instead of implying full visibility.

### Authentication and privacy implications

- Public-profile data is available without prior auth.
- Private/trusted-list data requires authenticated API session (cookie-based session at `api.wikitree.com`).
- The auth token (`authcode`) is for login confirmation; ongoing access is based on session cookies, not the token itself.
- Requests to private profiles may return privacy-limited records rather than hard failures. Chat must treat sparse records as partial data, not "no person".

### Search strategy guidance

- Use `searchPerson` (WikiTree API) and/or WT+ search for candidate discovery, then normalize to IDs/WikiTree IDs and enrich via `getPeople`.
- Prefer deterministic retrieval first (`getPeople`, `getConnections`, `getRelatives`) and only use AI synthesis after structured data is collected.

### Error/status handling expectations

- `status` may be an empty success marker or an error string depending on action.
- Chat should surface per-key failures from `resultByKey` when partial batches fail.
- Always include source-path metadata internally (which action(s) answered the prompt) for easier debugging and confidence messaging.

## Recommended Architecture

### Intent Router

- Map prompt to intent family: relationship, connection, location filter, CC7 query, person lookup, statistics, WT+ query fallback.

### Tool Adapters

- `wikiTreeApiAdapter`: direct calls to `getPerson`, `getPeople`, `getRelatives`, `getConnections`, etc.
- `wtPlusJsonAdapter`: handles structured JSON responses.
- `wtPlusIdListAdapter`: handles ID-list JSON responses and triggers `getPeople` enrichment.
- `wtPlusHtmlTableAdapter`: parses HTML table responses into normalized rows.

### Normalization Layer

Unify all adapter outputs into common internal records so answer logic is independent of source format.

Suggested normalized profile shape:

- `id`
- `wtId`
- `displayName`
- `birthLocation`
- `deathLocation`
- `birthDate`
- `deathDate`
- `gender`
- `source` (WikiTree API | WT+ JSON | WT+ HTML)

### Answer Layer

- Deterministic answer generation for count/filter/list questions.
- AI fallback only when deterministic path cannot fully satisfy the prompt.
- When partial/incomplete, clearly state what data source limits applied.

## Operational Notes

- Prefer batching `getPeople` to reduce API chatter and latency.
- Cap large result sets and communicate truncation when applied.
- Cache intermediate ID->profile lookups for active chat session.
- Log adapter path used per response for debugging.

## Deferred Work Marker

This note captures known WT+ integration complexity and should be treated as required implementation guidance for broader question coverage in Chat.
