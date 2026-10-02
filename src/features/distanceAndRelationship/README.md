This feature shows the distance (degrees) and relationship between the logged-in user and the profile being viewed.

## How it works

1. **Primary path (modern API)**

   - Calls `WikiTreeAPI.getConnections(..., { relation: 2 })`.
   - If a valid path is returned, it derives:
     - `distance` from path length,
     - relationship text from path analysis,
     - common ancestor entries from the path.

- It may enrich common ancestors:
  - second parent for direct-parent paths,
  - second MRCA via `getConnections(..., { relation: 2, ignoreIds: [firstMrcaId] })` when the returned path matches the first path except at the MRCA node.
- If the `ignoreIds` call returns no usable path or a different path shape, it does **not** assume a spouse as second MRCA.

2. **Fallback path (legacy endpoint)**
   - If modern `getConnections` does not return a usable path (common with privacy limits), it calls:
     - `getRelationJSON("DistanceAndRelationship_Relationship", userID, profileID)`.

- The legacy HTML parsing lives in `legacyRelationshipParser.js` (`deriveRelationshipFromLegacyDoc`), which is pure
  DOM/string logic covered by `legacyRelationshipParser.test.js`.
- The fallback then uses the **stable parser behavior** with safety guards:
  - parses `h3` text first (preferred source of direct relationship),
  - if `h3` is generic (e.g. `Grandson`), derives from explicit `This makes ... the <rel> of ...` text,
  - uses `bold` / `ancestor_1` legacy patterns when needed,
  - orients the parsed relationship to the **profile perspective** by checking whether the logged-in user name
    (from `#userData[data-mcolloquialname]`) is sentence subject or object,
  - inverts only when needed (e.g. `Ian is the grandson of X` => profile shown as grandparent,
    with gender-aware `grandfather`/`grandmother`),
  - preserves headline relations like sibling/cousin/nephew where applicable,
  - uses legacy `commonAncestors` if present.
- The late link/name heuristic overrides (h3 parent-link, `ancestor_1` user-link, user-subject) are last resorts:
  - they are skipped entirely when the relationship was already deterministically oriented from an explicit
    "X is the ... of Y" or "This makes ..." sentence,
  - a link is treated as the logged-in user only when its WT ID matches the user's WT ID — a name match alone is
    not enough, because relatives often share the user's first name (e.g. a father named after the son),
  - the `ancestor_1` override applies only to single-step paths; in longer paths `ancestor_1` relates the user to
    their parent, not the profile to the user.
- Legacy `commonAncestors` path lengths are normalized via `reducePathLength` for compatibility with extension-side relationship rendering.
- If modern distance is unavailable in fallback cases, distance is estimated from the resolved relationship text
  (and then cached/rendered), so privacy-only fallback pages can still show a degree badge.

## Caching

- Distance cache: IndexedDB `ConnectionFinderWTE` / `distance2`.
- Relationship cache: IndexedDB `RelationshipFinderWTE` / `relationship2`.
- Cache key: `distRelDbKeyFor(profileID, userID)`.
- TTL refresh: `DIST_REL_REFRESH_INTERVAL_MS` (12 hours), with manual refresh on click.

## UI behavior

- Shows distance badge (e.g. `1°`) near the profile heading.
- Shows relationship box (`Your cousin`, `Your daughter`, etc.) and common ancestor lines when available.
- Common ancestor lines are grouped by couple (`sortCommonAncestorsByCouple`): ancestors the same number of steps
  from both people are kept next to each other, closest couple first, father before mother. The `More` button
  therefore reveals whole couples rather than one member of each.
- Clicking distance or relationship triggers refresh.

## Testing as another member

Append URL parameters to any profile page to compute distance/relationship as if logged in as someone else:

```
https://www.wikitree.com/wiki/Combs-1234?wbe_test_as=Combs-9000&wbe_test_as_name=Major
```

- `wbe_test_as` — WT ID of the member to impersonate.
- `wbe_test_as_name` — their colloquial (preferred first) name, used by the legacy parser's name matching;
  fetched from the API (`RealName`/`FirstName`) if omitted.

While impersonating, cached records are neither read nor written, so test runs never pollute the real
user's cache. Results still depend on what the _logged-in_ session is allowed to see (private data stays private).
The `testAs` constant in `distanceAndRelationship.js` still works as a code-level alternative.

## Debug logs

Useful console logs include:

- `[WBE dist-rel] getConnections (relation=2) response:`
- `[WBE dist-rel] No path from getConnections; invoking legacy fallback`
- `[WBE dist-rel] getRelationJSON fallback response:`
- `[WBE dist-rel] legacy firstPText:`
- `[WBE dist-rel] legacy commonAncestors raw:` / `normalized:`
- `[WBE dist-rel] derived relationshipText from legacy:`
- `[WBE dist-rel] estimated distance from legacy relationship:`

## Notes

- `getConnections` remains the primary source of truth.
- Fallback is intentionally conservative for privacy-blocked cases and now includes orientation + inversion safeguards.
