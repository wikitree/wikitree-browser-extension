import {
  describeRelationChain,
  pickSpouseByOrdinal,
  rewriteOfRelationChain,
  splitOrdinalFromRelation,
} from "./chat_relation_chain_text";

describe("rewriteOfRelationChain", () => {
  test("'of' phrasings become a possessive chain (live corpus B7, 2026-10-02)", () => {
    expect(rewriteOfRelationChain("show me the siblings of the wife of Sarah's father")).toBe(
      "Sarah's father's wife's siblings"
    );
    expect(rewriteOfRelationChain("bios of the siblings of Sarah's father's wife")).toBe(
      "Sarah's father's wife's siblings' bios"
    );
    expect(rewriteOfRelationChain("siblings of the second wife of Beacall-385's son")).toBe(
      "Beacall-385's son's second wife's siblings"
    );
  });

  test("leaves other prompts alone", () => {
    [
      "Sarah's father's wife's siblings' bios",
      "bios of Sarah",
      "connection of Murray Maloney to me",
      "Profiles in England project but missing project box in bio",
      "siblings of Sarah",
      "Chicago military",
    ].forEach((prompt) => expect(rewriteOfRelationChain(prompt)).toBeNull());
  });
});

describe("splitOrdinalFromRelation", () => {
  test("reads an ordinal before the relation word", () => {
    expect(splitOrdinalFromRelation("second wife")).toEqual({ ordinal: 2, word: "wife" });
    expect(splitOrdinalFromRelation("1st husband")).toEqual({ ordinal: 1, word: "husband" });
    expect(splitOrdinalFromRelation("last wife")).toEqual({ ordinal: "last", word: "wife" });
    expect(splitOrdinalFromRelation("wife")).toEqual({ ordinal: null, word: "wife" });
  });
});

describe("pickSpouseByOrdinal", () => {
  // Beacall-385 (George): Dicken-246 m. 1667, Dicken-247 m. 1683.
  const spouses = [
    { Name: "Dicken-247", marriage_date: "1683-01-16" },
    { Name: "Undated-1", marriage_date: "0000-00-00" },
    { Name: "Dicken-246", marriage_date: "1667-01-30" },
  ];

  test("orders by marriage date, undated last", () => {
    expect(pickSpouseByOrdinal(spouses, 1).map((s) => s.Name)).toEqual(["Dicken-246"]);
    expect(pickSpouseByOrdinal(spouses, 2).map((s) => s.Name)).toEqual(["Dicken-247"]);
    expect(pickSpouseByOrdinal(spouses, "last").map((s) => s.Name)).toEqual(["Undated-1"]);
    expect(pickSpouseByOrdinal(spouses, 4)).toEqual([]);
    expect(pickSpouseByOrdinal(spouses, null)).toBe(spouses);
  });
});

describe("describeRelationChain", () => {
  test("joins the root and hops as possessives", () => {
    expect(describeRelationChain("Benny (Cantrell-3638)", ["father", "wife"])).toBe(
      "Benny (Cantrell-3638)'s father's wife"
    );
    expect(describeRelationChain("George (Beacall-385)", [])).toBe("George (Beacall-385)");
  });
});
