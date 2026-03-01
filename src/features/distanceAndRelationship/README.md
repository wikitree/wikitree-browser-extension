This feature computes and displays the relationship and "degrees of separation" between the current WikiTree user and the profile being viewed.

Behavior overview

- Primary data flow:

  - Try modern API: call `WikiTreeAPI.getConnections(..., { relation: 2 })` to get a computed path between the two people. If this returns a valid `path`, the code analyzes the path and derives:
    - `window.distance` (degrees = path.length - 1)
    - `relationship` (human-friendly label derived from ancestor/descendant steps)
    - `commonAncestors` (one or more ancestor entries synthesized from the path)
  - Fallback to legacy endpoint: if `getConnections` returns no usable path (often due to privacy restrictions), call `getRelationJSON("DistanceAndRelationship_Relationship", userID, profileID)` which returns `html` and sometimes a structured `commonAncestors` array. The feature then:
    - Parses the returned HTML to extract the primary relationship sentence (e.g., "Ian and [Private] are siblings"), any `<p>` paragraphs, and any `commonAncestors` returned by the legacy endpoint.
    - If legacy `commonAncestors` are present, they are normalized and used.
    - If the legacy `commonAncestors` array is empty but the HTML contains explicit sentences like "This makes X the father of Y.", the feature will attempt to synthesize minimal `commonAncestors` entries. BEFORE using such synthesized sentences to produce the final label, the code verifies that the sentence actually links the profile and the current user (i.e., one side matches the profile and the other matches the user). If the sentence does not link the two people (it refers to intermediate ancestors), it is ignored for direct relationship derivation.

- Relationship derivation heuristics:

  - When a modern `path` is available, `analyzeAncestorPath()` computes up/down steps and `relationshipFromPathAnalysis()` maps those steps to labels (e.g., parent, grandparent, cousin, aunt/uncle, niece/nephew, etc.).
  - When using legacy HTML:
    - Simple heuristics extract words after "is the" / "is" / "are" and regexes are used to find relationship keywords.
    - Possessives ("Ian's niece") are normalized to the bare relationship word.
    - For explicit "This makes X the <rel> of Y." sentences, the code determines which side is the `profile` and which side is the `user` using name variants and dataset fields (page `userData` attributes when available). Only if the sentence links profile↔user is the sentence used to derive the displayed relationship. Otherwise it is treated as describing relationships to intermediate ancestors and ignored.
    - Inversions: when the sentence indicates the profile is the object (e.g., "Martyn is the father of Tanya") and the profile is indeed the object, the code will invert the parent relation to a child term (son/daughter/child) based on the profile's known gender.

- Name matching and normalization:

  - The code builds `nameVariantsForProfile()` from `profilePerson` fields (FirstName, LastNameCurrent, LastNameAtBirth, profile `Name`), and normalizes strings (removing "[Private]", punctuation, extra whitespace, case).
  - For the current user it also reads `document.getElementById('userData')` dataset fields (when available) to create variants for matching.
  - These variants are used to decide whether a legacy sentence's subject/object refers to the profile or the viewer.

- Common-ancestor enrichment:
  - When a common ancestor entry indicates a direct parent on one side, the code will attempt to fetch the other parent or a pivot spouse using `getRelatives()` to present two common-ancestor lines when available.

Caching and UI

- Storage: results are cached in IndexedDB stores:
  - `ConnectionFinderWTE` / store `distance2` for distance records
  - `RelationshipFinderWTE` / store `relationship2` for relationship records
  - Keys are generated with `distRelDbKeyFor(profileID, userID)`.
- TTL: cached entries have a 12-hour refresh interval (`DIST_REL_REFRESH_INTERVAL_MS`) after which a background refresh is scheduled; users can also force-refresh by clicking the distance badge or relationship box.
- UI rendering:
  - Shows a distance badge like `1°` next to the profile name.
  - Shows a relationship box `Your daughter` / `Your cousin` etc. For direct parent relations (both path lengths == 1) a single-line short label is rendered.

Debugging and diagnostics

- The feature emits detailed console logs to help debug privacy-edge cases and parsing heuristics, including:
  - Modern API outputs: `[WBE dist-rel] getConnections (relation=2) response:`
  - Legacy fallback HTML and parsing: `[WBE dist-rel] getRelationJSON fallback response:` and `[WBE dist-rel] legacy firstPText:`
  - Normalized `commonAncestors` diagnostics: `[WBE dist-rel] legacy commonAncestors raw:` and `[WBE dist-rel] legacy commonAncestors normalized:`
  - When synthesizing common ancestors: `[WBE dist-rel] synthesized commonAncestors from legacy HTML:` and `[WBE dist-rel] synthesized derived relationshipText:`
  - Mapping diagnostics that show raw vs normalized path lengths: `[WBE dist-rel] legacy CA mapping:`

Guidance for troubleshooting incorrect labels

- If you see an incorrect label (for example "Your father" when you expect "Your daughter"):

1.  Open the developer console on the profile page and look for the debug messages listed above.
2.  If a `synthesized commonAncestors` entry was used, check whether the `This makes...` sentence actually names both the profile and the current user. If it does not, that sentence will be ignored and the code will fall back to ancestor heuristics.
3.  Provide the exact console logs (especially the `legacy firstPText`, `synthesized commonAncestors`, and `legacy CA mapping`) and we can refine name-variant matching or the inversion logic.

Notes and limitations

- Legacy HTML contents vary widely across cases (private profiles, truncated names, intermediate ancestor descriptions). The code uses heuristics and conservative checks to avoid mis-applying unrelated sentences; however, edge-cases remain where additional name-variant matching or fuzzy matching would improve results.
- Logging is intentionally verbose for debugging — consider reducing or gating debug output before publishing to a wider audience.
