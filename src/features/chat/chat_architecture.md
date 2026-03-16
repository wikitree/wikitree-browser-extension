# Chat Architecture Notes

## Original Intent

Chat should classify a free-text request, choose the right deterministic data source first, and only use AI for parsing or supplemental explanation when structured tools are not enough.

The key design rule is:

- Connection and relationship-path questions should use `getConnections`.
- Ancestor, descendant, spouse, sibling, parent, child, and list/count questions should mostly use `getPeople` or other direct WikiTree API calls.
- Prompts beginning with `Search` should respect the user-selected mode: `WT`, `WT+`, or `AI`.

## Search Modes

### `WT`

Use standard WikiTree API search and deterministic lookups.

- Prefer `searchPerson`, `getPerson`, `getPeople`, and related API endpoints.
- Use this when the user wants profile search behavior, not category/WT+ behavior.

### `WT+`

Use WikiTree+ endpoints for categories and other query patterns that are awkward or unavailable via the standard API.

- Some WT+ calls return profile ID lists only.
- Some WT+ calls return HTML tables.
- WT+ results often need follow-up enrichment through `getPeople` before answer generation.

### `AI`

Use AI to parse free text and provide broader explanatory output.

- AI should receive bounded context from the page, recent chat, and prior structured results.
- AI should not replace deterministic tool execution for connection, people, or search queries when a local tool can answer them.

## Intent To Data-Source Map

### Connection / distance / relationship path

- Primary source: `WikiTreeAPI.getConnections`
- Fallback label helper: `getRelationJSON`
- Expected output: path, distance, relationship summary, optional popup/table view

### Ancestors / descendants / family lists / counts

- Primary source: `WikiTreeAPI.getPeople`
- Use relationship expansion such as `ancestors`, `descendants`, `nuclear`, or related deterministic fetches
- Expected output: list, count, grouped summary, or table

### Direct person lookup / profile search

- `WT` mode: `searchPerson` and follow-up `getPerson`/`getPeople`
- `WT+` mode: `wtAPIProfileSearch` or other WT+ adapters, then enrich if needed

### General explanation / synthesis

- AI only after local routing is attempted or when the user explicitly chose `AI`

## Current Structural Problem

`chat.js` currently mixes too many responsibilities:

- popup UI state
- chat history state
- prompt routing
- AI prompt construction
- connection resolution and disambiguation
- `getPeople`/search result handling
- WT+ adaptation
- bio popup workflows

This makes it easy for fixes to land in the wrong place and hard for future agents to see where a change belongs.

## Target Module Boundaries

### `chat.js`

Keep as the orchestrator only.

- event wiring
- top-level state
- mode selection
- call router, adapters, and UI helpers

### `chat_router.js`

Own prompt parsing and intent classification.

- keyword detection
- target extraction
- subject parsing
- result-operation parsing

### `chat_disambiguation.js`

Own candidate-choice prompts and selection parsing.

- score-gap threshold for when to ask the user to choose
- human-readable disambiguation message formatting
- reply parsing (number, ordinal, or explicit WikiTree ID)

### `chat_connections.js`

Own connection-specific execution.

- target resolution
- page-context matching
- candidate ranking and disambiguation
- `getConnections` execution
- fallback relationship labeling

### `chat_people.js`

Own deterministic people queries.

- ancestor/descendant/family list fetches
- list/count transformations
- `getPeople` paging and enrichment helpers

### `chat_search.js`

Own `Search` behavior.

- mode split between `WT`, `WT+`, and `AI`
- local search preparation
- WT+ adapter calls

Current implementation note:

- explicit Search mode dispatch for `WT` and `AI` has been extracted to `chat_search_mode.js`
- profile-search execution (`tryHandleProfileSearchPrompt`) now lives in `chat_profile_search.js`
- `chat.js` should only initialize the search handler via dependency injection and route calls to it

### `chat_ai.js`

Own AI-facing helpers.

- recent-conversation prompt assembly
- structured parse helpers
- planner/disambiguation/category extraction helpers
- bounded page/profile context packaging

Current implementation note:

- shared AI helpers (`buildRecentConversationForAi`, `getChatAiConfig`, `hasAnyApiKey`) now live in `chat_ai.js`
- `chat.js` should use these helpers via dependency wiring and avoid duplicating provider/key selection logic

### Existing modules that already fit this shape

- `ui.js`: popup and loader UI
- `tables.js`: normalized tabular output
- `chat_options.js`: settings
- `chat_bio.js`: biography popups, spouse/relative bio flows, and family lookup helpers used by bio prompts
- `chat_history.js`: chat history persistence, retry tracking, message rendering, and action-button reconstruction for prior messages
- `chat_dom_lookup.js`: profile-page DOM ID extraction for spouses/children/siblings/parents
- `chat_cc.js`: CC fetch/cache handlers and watchlist flow (`CC` summary/location + watchlist table/list output)
- `chat_last_result.js`: result-operation refinements (`table`, `count`, `countBy`, `sort`, `filter`)
- `chat_relations.js`: deterministic relation handlers (`siblings`, `parents`, `children`, `spouses`, `aunts/uncles`, `grand*` relations, relation-chain parsing/list/count)
- `chat_planner.js`: AI-assisted intent planning and disambiguation — `parsePlannerJson`, `tryHandleAiPlannedIntent`, `tryAiDisambiguateConnectionTarget`, `tryAiParseCategoryName`, `tryAiExpandConnectionTarget`

## Immediate Refactor Rules

When editing Chat going forward:

1. If the change is prompt parsing, put it in `chat_router.js`.
2. If the change is connection lookup behavior, keep it on the `getConnections` path.
3. If the change is `Search` mode behavior, make the selected mode explicit before execution.
4. If the change is AI context or AI parsing, keep it out of the deterministic execution functions.
5. Do not duplicate parsing helpers between `chat.js` and helper modules.

## Current Refactor Progress

The connection-target extraction helper is now shared from `chat_router.js` instead of being duplicated in `chat.js`, and the inferred page-profile target is now passed through the actual connection resolver.

The `getConnections` workflow now lives in `chat_connections.js` rather than inside `chat.js`. That module owns:

- target resolution for connection lookups
- correction/retry handling for alternate person matches
- `getConnections` execution and fallback relation attempts
- legacy relationship-label parsing for no-path cases

This establishes the intended direction: parsing in the router, connection execution in a dedicated module, and `chat.js` as the orchestrator.

The profile-search pipeline now also lives outside `chat.js` in `chat_profile_search.js`.
This includes search modifier parsing, optional AI query parsing, deterministic WT/WT+ category handling, spouse filtering, and table shaping.

Core AI configuration and conversation-history helpers now live in `chat_ai.js`, further reducing orchestration logic in `chat.js`.

Candidate disambiguation helpers also live outside `chat.js` in `chat_disambiguation.js`.

Profile-page relation-link scraping helpers now live in `chat_dom_lookup.js`.

CC and watchlist handlers now live in `chat_cc.js`, with CC cache state owned inside that module.

Last-result refinement logic now lives in `chat_last_result.js` and is wired from `chat.js` via a dependency-injected factory.

Relation query execution now also lives in `chat_relations.js` and is wired from `chat.js` via a dependency-injected factory.

Deterministic people-query execution now also lives in `chat_people.js`, including ancestor/descendant list handling, spouse-list handling, age-at-death summaries, and profile-family CC matching.

Biography popup and relative-bio execution now also lives in `chat_bio.js`, including direct bio prompts, spouse-bio flows, tiled/list bio opening, and shared child/sibling/parent lookup helpers.

Chat history persistence and message rendering now also lives in `chat_history.js`, including session restore/clear, retry-request tracking, inline "show more" expansion, and reconstruction of saved Connections/Table/Show Bio actions.

AI-assisted planning and disambiguation now also lives in `chat_planner.js`. This includes `parsePlannerJson` (JSON extraction from AI responses), `tryHandleAiPlannedIntent` (sends the full planner prompt and routes the parsed intent), `tryAiDisambiguateConnectionTarget` (AI-ranked candidate resolution for connection targets), `tryAiParseCategoryName` (canonical category-query extraction), and `tryAiExpandConnectionTarget` (alternate search-name / WikiTree ID suggestion). All five are wired into `chat.js` via `createChatAiPlannerHandlers`. Note that `executeRoutedIntent` is injected as a thunk because it is defined after the factory call.
