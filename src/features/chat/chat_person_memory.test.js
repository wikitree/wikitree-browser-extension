import {
  buildResolvedAliasRegex,
  extractAliasCandidates,
  extractResolvedPeopleFromMessage,
  isLikelyPersonAliasLabel,
  normalizePersonMemoryToken,
  sanitizeResolvedPersonDisplayName,
} from "./chat_person_memory";

describe("chat person memory helpers", () => {
  test("treats bare conversational replies as non-names", () => {
    // Regression: answering an offered follow-up with "Sure." used to look like
    // a surname and ran a profile search, returning Schorr/Schier/Shore matches.
    for (const reply of ["Sure", "sure.", "Yes", "yeah", "OK", "okay", "nope", "thanks"]) {
      expect(isLikelyPersonAliasLabel(reply)).toBe(false);
      expect(extractAliasCandidates(reply)).toEqual([]);
    }
    // Real names must still pass.
    expect(isLikelyPersonAliasLabel("Alex Example")).toBe(true);
  });

  test("keeps likely person aliases and rejects generic relation words", () => {
    expect(extractAliasCandidates("Alex Example")).toEqual(expect.arrayContaining(["Alex Example", "Alex", "Example"]));
    expect(extractAliasCandidates("cousins")).toEqual([]);
    expect(extractAliasCandidates("times removed for Alex")).toEqual([]);
  });

  test("does not learn sentence fragments from deterministic no-result messages", () => {
    expect(
      extractResolvedPeopleFromMessage(
        "I couldn't find any 1st cousins 3 times removed for Alex Example (Example-123) in currently accessible family data yet."
      )
    ).toEqual([]);
  });

  test("does not learn sentence fragments from AI prose around a WTID", () => {
    expect(
      extractResolvedPeopleFromMessage(
        "Short answer: I can't list any first cousins three times removed for Alex Example (Example-123) because the public profile currently has no family links."
      )
    ).toEqual([]);
  });

  test("sanitizes polluted display labels to the WTID fallback", () => {
    expect(
      sanitizeResolvedPersonDisplayName("can't list any first cousins three times removed for Alex", "Example-123")
    ).toBe("Example-123");

    expect(sanitizeResolvedPersonDisplayName("Alex Example", "Example-123")).toBe("Alex Example");
  });

  test("does not match aliases used possessively", () => {
    const aliasRegex = buildResolvedAliasRegex("Alex");

    expect(aliasRegex.test("Alex and Dora")).toBe(true);
    expect(aliasRegex.test("Alex's first cousins three times removed")).toBe(false);
    expect("Alex and Dora".replace(aliasRegex, "Example-123")).toBe("Example-123 and Dora");
  });

  test("still learns normal person labels from name and WTID text", () => {
    expect(extractResolvedPeopleFromMessage("Alex Example (Example-123)")).toEqual([
      { displayName: "Alex Example", wtId: "Example-123" },
    ]);
  });

  test("normalizes aliases consistently", () => {
    expect(normalizePersonMemoryToken("Riël-5")).toBe("riel-5");
  });
});
