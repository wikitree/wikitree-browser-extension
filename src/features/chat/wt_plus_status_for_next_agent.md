**WT+ Category Search Feature — Summary & Current Problem**

Summary:

- Implemented deterministic WT+ CategoryFull searches for chat-driven "Search ... category" prompts.
- Chat UI: radios added to choose mode (WT / WT+ / AI) when prompt begins with "Search".
- Flow: detect category → build Query-Builder string `CategoryFull=<value>` (comma+space -> `__`, spaces -> `_`) → call `wtAPIProfileSearch` once (expect numeric IDs in `response.profiles`) → call `WikiTreeAPI.getPeople` to fetch full profiles → render table.
- AI enrichment: when a prompt references a resolvable profile name or key, the chat calls `WikiTreeAPI.getProfile(..., "Bio,Sources,Notes,Categories")` and injects that text into the AI prompt.

Files/areas changed:

- `src/features/chat/chat.js` — major changes: category detection, deterministic `CategoryFull` construction, early intercept in `tryHandlePersonBioPrompt`, radio UI, AI enrichment, debug logs, and column filtering for category results.
- `src/core/API/wtPlusAPI.js` — used by chat to call WT+ profile-search endpoints (confirmed endpoint format returning `response.profiles`).

Current problem:

- Expected debug logs (detection → constructed qb → encodedQ → debugUrl → WT+ response → getProfile results → AI prompt payload) are not visible in the browser console for the tester.
- Many log statements use `console.debug(...)`, which can be hidden by DevTools log-level filters or occur in a different DevTools context (page vs popup vs background/service worker).

Repro steps to validate and collect diagnostics:

1. Build the extension locally:

```sh
npm run build-dev
```

2. Install/load the built extension and exercise these scenarios:

- WT+ Category test: open the chat popup, select WT+ mode, then send: `Search "Wem, Shropshire" category`.
- AI profile enrichment test: send: `Search Norman's time in the Masons.` (or similar) and select AI mode.

3. Capture console output in these places (one or more may contain the logs):

- Page context DevTools (Inspect the webpage where content scripts run)
- Extension popup DevTools (open the popup, then right-click → Inspect)
- Background/service worker DevTools (chrome://extensions → Inspect background)

What to collect (copy/paste into this repo issue or reply):

- Any console lines containing keywords: `wbe:`, `wtAPIProfileSearch`, `CategoryFull=`, `constructed qb`, `encodedQ`, `debugUrl`, `getProfile`, `AI prompt`, or `resolved profile`.
- The WT+ debug URL and the returned JSON `response.profiles` (or any error payload).
- `getProfile` responses (Bio,Sources,Notes,Categories) or permission errors.

Suggested quick fixes to make logs visible (choose one):

1. Replace `console.debug(...)` with `console.log(...)` temporarily in `src/features/chat/chat.js` and rerun `npm run build-dev` — guaranteed visible across DevTools filters.
2. If you prefer not to rebuild, inspect all three DevTools contexts (popup/page/background); ensure Console level is set to Verbose and no text filters are applied.
3. Add a temporary on-page debug panel inside the chat UI that appends log lines to the popup DOM (no DevTools needed).

Suggested next steps for the next agent:

- If logs are missing: apply option (1) above (temporary `console.debug` → `console.log`), run `npm run build-dev`, and rerun repro steps to capture logs.
- If WT+ returns numeric IDs as expected, verify `WikiTreeAPI.getPeople` is called and that table rendering receives numeric IDs.
- If `getProfile` returns partial/private content or errors, verify Apps Login/auth state and log the full response payload.

Notes/assumptions:

- The deterministic `CategoryFull` encoding must match what the WT+ Query Builder expects; the exact encoded URL is key for troubleshooting.
- Private profile fields require Apps Login; without it `getProfile` returns public-only data.

File created for handoff: `/Users/steve/GitHub/wikitree-browser-extension/src/features/chat/wt_plus_status_for_next_agent.md`
