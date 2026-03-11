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
- Clicking distance or relationship triggers refresh.

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
