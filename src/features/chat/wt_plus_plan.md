Plan: Integrate WikiTree+ (WT+) category searches into Chat

Goal

- Allow chat prompts like "Search Wem, Shropshire category" or "Category:Wem, Shropshire" to return a table of profiles in that category.

Scope

- Start with a minimal, robust implementation that:
  - Detects category-style prompts in chat.
  - Gets IDs from WT+
  - Loads profile data via `WikiTreeAPI.getPeople` and renders a results table using existing chat table helpers.

Phases

1. Add plan document and tracking (this file).
2. Implement detection and handler in `tryHandleProfileSearchPrompt` (chat) for category queries.
3. Use wtPlusAPI profile search to get numeric IDs
4. Retrieve profile records with `WikiTreeAPI.getPeople`, map to chat's standard row shape (`mapApiPersonToStandardRow`).
5. Build a table via `makeStandardProfileTable` and return as chat result (so it can be opened with the normal Table UI).
6. Test in dev (run `npm run build-dev`, open WikiTree and exercise prompts).

Notes and caveats

Next actions

- Implement the handler in chat (small patch applied elsewhere).
- Rebuild and verify the chat prompt flow: try "Search Wem, Shropshire category" and open the resulting Table.
