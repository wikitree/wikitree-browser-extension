# How the Chat Feature Works

This document explains the same feature in two ways:

- Version 1 is technical (for developers and power users).
- Version 2 is simple (for non-technical readers).

The summary below is based on the current implementation across `chat.js` and the split handler modules in this folder.

## Version 1: Technical Walkthrough

### 1. Runtime shape (orchestrator + handlers)

- `chat.js` is the orchestrator. It owns top-level state, popup wiring, and dependency injection.
- Domain logic is delegated to focused modules created via factory functions:
  - `chat_router.js` for intent parsing.
  - `chat_connections.js` for relationship path execution/disambiguation.
  - `chat_people.js` for deterministic ancestor/descendant/list/count flows.
  - `chat_relations.js` for relation-chain logic (`mother's sister's husband`, etc.).
  - `chat_profile_search.js` + `chat_search_mode.js` for `Search` mode behavior (`WT`, `WT+`, `AI`).
  - `chat_bio.js` for bio popups and kin bio lookups.
  - `chat_cc.js` for CC summary/location and watchlist.
  - `chat_last_result.js` for follow-up operations on the latest structured result.
  - `chat_history.js` for persistence/rendering/action reconstruction.

### 2. Prompt classification pipeline

- Primary classifier: `routeChatPrompt(...)` in `chat_router.js`.
- It maps user text to `ChatIntent` values such as:
  - `CONNECTION_LOOKUP`
  - `RELATION_COUNT`
  - `ANCESTOR_LIST` / `DESCENDANT_LIST`
  - `CC7_LOCATION_FILTER` / `CC_SUMMARY`
  - `WATCHLIST`
  - `PROFILE_SEARCH`
  - `LAST_RESULT_OPERATION`
  - `FALLBACK_AI`

Routing priority is deterministic-first. AI is used for parsing assistance or fallback, not as the first choice for data retrieval when structured APIs can answer.

### 3. Data-source strategy by intent

#### Connections and relationship paths

- Implemented in `chat_connections.js`.
- Main source: `WikiTreeAPI.getConnections(...)`.
- Target resolution path includes:
  - explicit WikiTree ID detection
  - strict/relaxed `searchPerson(...)` lookups
  - ranking (`rankConnectionMatches(...)`)
  - disambiguation prompts when score gaps are small (`chat_disambiguation.js`)
  - optional AI-assisted candidate choice/expansion (`chat_planner.js`)

#### Deterministic people queries

- Implemented in `chat_people.js` and `chat_relations.js`.
- Main source: `WikiTreeAPI.getPeople(...)` (+ relation expansion and paging).
- Provides reusable row sets that support in-chat refinements without re-running original discovery.
- Relation chains can be parsed locally first, then AI-assisted only if local parsing fails.

#### Search mode dispatch

- Gatekeeper: `chat_search_mode.js`.
- Behavior by mode:
  - `WT`: deterministic WikiTree API path.
  - `WT+`: WikiTree+ query path (often with canonicalization/enrichment).
  - `AI`: direct model response with bounded context.
- `chat_profile_search.js` contains WT+ grammar/canonicalization and enrichment helpers.

#### CC and watchlist

- Implemented in `chat_cc.js`.
- CC retrieval uses paged `getPeople(...)` and a short-lived in-memory cache.
- If CC API retrieval fails for CC7, it can fall back to current-page table extraction.

#### Biography workflows

- Implemented in `chat_bio.js`.
- Uses `getProfile(...)` / `getRelatives(...)` + DOM-derived fallbacks for spouse/child/sibling/parent discovery.
- Supports single bio popup, list popup, and tiled popup display.

### 4. Result model and follow-up operations

- Structured table shapes are centralized in `tables.js` (`makeStandardProfileTable`, `makeAncestorProfileTable`, etc.).
- Last-result operations (`table`, `count`, `countBy`, `sort`, `filter`) are handled in `chat_last_result.js`.
- This enables prompts like "sort that", "count by country", and "filter to females" without repeating upstream retrieval.

### 5. State, persistence, and UI behavior

- `chat_history.js` persists chat/session state in `sessionStorage` and prunes payloads when storage quota is tight.
- It restores actionable history (connections/table/bio actions) and tracks retry prompts.
- `ui.js` handles popup positioning, viewport clamping, connections popup rendering, and sanitized HTML insertion for safe display.

### 6. AI boundaries in the current implementation

- Shared config/history helpers live in `chat_ai.js`.
- Planner/disambiguation helpers live in `chat_planner.js`.
- AI usage is conditional on API key availability and settings.
- Deterministic API calls remain the primary truth source for factual genealogy answers.

## Version 2: Simple Explanation

Chat works like a helper with two gears:

- Gear 1: use WikiTree data tools directly (most accurate for factual questions).
- Gear 2: use AI to interpret unclear wording, break ties, or explain things.

### What happens when you ask something

1. Chat reads your sentence and decides what type of question it is.
2. It tries the matching data tool first (connections, people lists, search, CC, watchlist, etc.).
3. If names are ambiguous, it usually tries to resolve the best match automatically (ranking and sometimes AI), and in some flows it asks you to choose.
4. It shows the result as text and, when useful, as a table or popup.
5. It remembers your recent result so follow-up commands can reuse it.

### Examples

- "How am I related to X?" -> connection path tool.
- "Show my 4th great-grandparents" -> people/ancestor query.
- "Search ..." -> uses the selected mode:
  - `WT` for regular WikiTree search.
  - `WT+` for WikiTree+ query style.
  - `AI` for conversational interpretation.
- "Sort that by birth" or "count by country" -> modifies the last table result.

### Why this design is useful

- Factual answers come from deterministic APIs whenever possible.
- AI helps with interpretation, not replacing the data source.
- Reusing last results makes follow-up questions faster and more natural.
