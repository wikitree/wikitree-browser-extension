import {
  aliasStartsLongerName,
  buildResolvedAliasRegex,
  extractAliasCandidates,
  extractResolvedPeopleFromMessage,
  isLikelyPersonAliasLabel,
  normalizePersonMemoryToken,
  rewritePromptWithRememberedPerson,
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

describe("remembered nicknames inside a different full name (live, 2026-10-03)", () => {
  const remembered = "Alfred Stephen Fry";
  test.each([
    ["my connection to Stephen Fry", true],
    ["my connection to stephen fry", true],
    ["me to Stephen Hawking", true],
    ["my connection to Stephen", false],
    ["how is Stephen related to me", false],
    ["Stephen and Mary", false],
  ])("%s", (prompt, expected) => {
    expect(aliasStartsLongerName(prompt, buildResolvedAliasRegex("Stephen"), remembered)).toBe(expected);
  });

  test("the surname can come from the WikiTree ID when the display name lacks it", () => {
    const regex = buildResolvedAliasRegex("Stephen");
    expect(aliasStartsLongerName("me to stephen fry", regex, "Alfred Stephen", "Fry-6447")).toBe(true);
    expect(aliasStartsLongerName("is stephen related to me", regex, "Alfred Stephen", "Fry-6447")).toBe(false);
  });
});

describe("rewriting a prompt with a remembered person (live, 2026-10-03)", () => {
  const alfred = { wtId: "Fry-6447", displayName: "Alfred Stephen", aliases: ["Stephen"] };
  const stephenFry = { wtId: "Fry-2606", displayName: "Stephen", aliases: ["Stephen Fry", "Stephen", "Fry"] };

  test("a remembered nickname alone is expanded", () => {
    expect(rewritePromptWithRememberedPerson("how is Stephen related to me?", alfred).prompt).toBe(
      "how is Alfred Stephen related to me?"
    );
  });

  test.each(["me to stephen fry", "me to Stephen Fry"])("a different full name is kept: %s", (prompt) => {
    expect(rewritePromptWithRememberedPerson(prompt, alfred)).toMatchObject({ prompt, changed: false });
  });

  test.each(["me to stephen fry", "Murray Maloney to Stephen Fry"])(
    "a shorter display name, or a shorter alias inside the same name, never replaces what was typed: %s",
    (prompt) => {
      expect(rewritePromptWithRememberedPerson(prompt, stephenFry)).toMatchObject({ prompt, changed: false });
    }
  );

  test("a bare surname is not an alias for one person", () => {
    expect(rewritePromptWithRememberedPerson("my connection to the Fry family", alfred)).toMatchObject({
      changed: false,
    });
    expect(
      rewritePromptWithRememberedPerson("my connection to the Fry family", { ...alfred, aliases: ["Fry"] })
    ).toMatchObject({ changed: false });
  });
});

describe("possessives are never nicknames (live, 2026-10-03)", () => {
  test.each(["Calvin's father", "Calvin's", "the Joneses' farm"])("%s", (value) => {
    expect(extractAliasCandidates(value)).toEqual([]);
  });

  test("names with apostrophes still count", () => {
    expect(extractAliasCandidates("Mary O'Brien")).toContain("O'Brien");
  });

  test("a possessive stored by older code doesn't rewrite the prompt", () => {
    const joseph = { wtId: "Tabler-152", displayName: "Joseph", aliases: ["Calvin's"] };
    expect(rewritePromptWithRememberedPerson("how am I connected to Calvin's children?", joseph)).toMatchObject({
      changed: false,
    });
  });
});

// I9 (live, 2026-10-03): "people with the surname Alley born in Nelson" became
// "…surname Ellen…": Alley is Ellen (Cook) Alley's married name.
describe("surnames are not rewritten to a remembered person", () => {
  const ellen = { wtId: "Cook-8721", displayName: "Ellen", aliases: ["Ellen (Cook) Alley", "Ellen", "Alley"] };
  const alfred = { wtId: "Fry-6447", displayName: "Alfred Stephen", aliases: ["Stephen"] };

  test.each([
    "people with the surname Alley born in Nelson",
    "Alley born in Nelson",
    "the Alley family in Motueka",
  ])("%s", (prompt) => {
    expect(rewritePromptWithRememberedPerson(prompt, ellen)).toMatchObject({ prompt, changed: false });
  });

  test("a word introduced as a surname is left alone", () => {
    const prompt = "people with the last name Stephen";
    expect(rewritePromptWithRememberedPerson(prompt, alfred)).toMatchObject({ prompt, changed: false });
  });
});
