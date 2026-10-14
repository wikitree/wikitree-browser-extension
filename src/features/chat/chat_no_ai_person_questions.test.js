// Questions about the person on the page that needed the AI (no-AI measure, 2026-10-14):
// new wordings for answers the code already works out, and two new answers (outlived, century).
jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));

import { buildChildrenAfterDeathAnswer, buildOutlivedAnswer, buildStepchildrenAnswer, parseMarriagePrompt } from "./chat_marriage";
import { createChatPeopleHandlers } from "./chat_people";
import { isEmigrantRow } from "./chat_place_country";
import { placeCountry } from "./chat_world_events_data";
import { buildProfileFactAnswer, parseProfileFactPrompt, researchNotesText } from "./chat_profile_facts";
import { buildSourcesAnswer, parseProfileSourcesPrompt } from "./chat_sources";
import { buildRelativeFactAnswer, parseRelativeFactPrompt } from "./chat_relative_fact";
import { ChatIntent, extractConnectionEndpoints, parseLongestLivedPrompt, routeChatPrompt } from "./chat_router";

const labelOf = (person) => `${person.RealName} (${person.Name})`;

describe("how many times married → the marriage list", () => {
  test.each([
    "how many times was she married?",
    "how many times did she marry?",
    "how many times has he been married?",
    "how many marriages did she have?",
    "was she married more than once?",
    "did she remarry?",
    "did he marry again?",
  ])("%s", (prompt) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.PERSON_MARRIAGE);
    expect(parseMarriagePrompt(prompt)).toEqual({ target: "", parents: false });
  });
  test("a named person", () => expect(parseMarriagePrompt("how many times was Ellen Cook married?")).toEqual({ target: "Ellen Cook", parents: false }));
});

describe("outlived a husband or wife", () => {
  test.each([
    ["how many years did she outlive her husband?", {}],
    ["how long did she outlive her husband", {}],
    ["did she outlive her husband?", {}],
    ["did he outlive his first wife?", { ordinal: 1 }],
    ["by how many years did she survive her second husband?", { ordinal: 2 }],
  ])("%s", (prompt, extra) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.PERSON_MARRIAGE);
    expect(parseMarriagePrompt(prompt)).toEqual({ target: "", parents: false, ask: "outlived", ...extra });
  });

  const person = { label: "Ellen Burton (Cook-8721)", death: "1895-06-02" };
  test("she outlived him, and a remarriage doesn't stop the count", () => {
    const marriages = [
      { spouseLabel: "William Burton (Burton-1)", date: "1855-01-01", spouseDeath: "1880-03-10" },
      { spouseLabel: "John Alley (Alley-1)", date: "1882-01-01", spouseDeath: "1899-01-01" },
    ];
    expect(buildOutlivedAnswer({ person, marriages, ordinal: 1 })).toBe("Ellen Burton (Cook-8721) outlived William Burton (Burton-1) by 15 years (died 1880-03-10 and 1895-06-02).");
    expect(buildOutlivedAnswer({ person, marriages })).toBe(
      "- Ellen Burton (Cook-8721) outlived William Burton (Burton-1) by 15 years (died 1880-03-10 and 1895-06-02).\n" +
        "- John Alley (Alley-1) outlived Ellen Burton (Cook-8721) by 3 years (died 1895-06-02 and 1899-01-01)."
    );
  });
  test("missing or same-year deaths", () => {
    expect(buildOutlivedAnswer({ person: { ...person, death: "" }, marriages: [{ spouseLabel: "W (B-1)", spouseDeath: "1880-03-10" }] })).toBe(
      "W (B-1): no death date is recorded for Ellen Burton (Cook-8721), so I can't tell."
    );
    expect(buildOutlivedAnswer({ person, marriages: [{ spouseLabel: "W (B-1)", spouseDeath: "1895-00-00" }] })).toBe(
      "Ellen Burton (Cook-8721) and W (B-1) died the same year (1895, 1895-06-02)."
    );
    expect(buildOutlivedAnswer({ person, marriages: [{ spouseLabel: "W (B-1)", spouseDeath: "1880-01-01" }], ordinal: 2 })).toBe(
      "Ellen Burton (Cook-8721) has 1 recorded marriage, so there is no such spouse."
    );
  });
});

describe("what century", () => {
  test.each([
    ["what century was she born in?", "", "birthCentury"],
    ["which century did he die in?", "", "deathCentury"],
    ["in what century was Cook-8721 born?", "Cook-8721", "birthCentury"],
  ])("%s", (prompt, owner, fact) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.RELATIVE_FACT);
    expect(parseRelativeFactPrompt(prompt)).toEqual({ owner, relationRaw: "self", fact });
  });
  test("1800 is the 19th century, as in the searches; no year says so", () => {
    const ellen = { RealName: "Ellen", Name: "Cook-8721", BirthDate: "1832-05-01", DeathDate: "1900-00-00" };
    expect(buildRelativeFactAnswer([ellen], "birthCentury", labelOf)).toBe("Ellen (Cook-8721) was born in the 19th century (1832).");
    expect(buildRelativeFactAnswer([ellen], "deathCentury", labelOf)).toBe("Ellen (Cook-8721) died in the 20th century (1900).");
    expect(buildRelativeFactAnswer([{ ...ellen, BirthDate: "0000-00-00" }], "birthCentury", labelOf)).toBe("Ellen (Cook-8721): no birth year recorded.");
  });
});

describe("which ancestor died youngest", () => {
  test.each(["which of her ancestors died youngest?", "which of my ancestors died youngest", "my shortest-lived ancestor"])("%s", (prompt) => {
    expect(parseLongestLivedPrompt(prompt)?.pick).toBe("shortest");
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.ANCESTOR_LIST);
  });
  test("lived longest is unchanged", () => expect(parseLongestLivedPrompt("which of my ancestors lived longest?")?.pick).toBe("longest"));
});

describe("is X related / connected to Y", () => {
  test.each([
    ["is Ellen connected to me?", { source: "", target: "Ellen" }],
    ["is she related to Captain James Cook?", { source: "she", target: "Captain James Cook" }],
    ["is she related to me?", { source: "", target: "this profile" }],
    ["are we related?", { source: "", target: "this profile" }],
    ["are Ellen and William Burton related?", { source: "Ellen", target: "William Burton" }],
  ])("%s", (prompt, endpoints) => {
    expect(extractConnectionEndpoints(prompt)).toEqual(endpoints);
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.CONNECTION_LOOKUP);
  });
  test("the global tree is still the profile fact; famous people still need the AI", () => {
    expect(routeChatPrompt("is she connected to the global tree?").intent).toBe(ChatIntent.PROFILE_FACT);
    expect(routeChatPrompt("is she connected?").intent).toBe(ChatIntent.PROFILE_FACT);
    expect(extractConnectionEndpoints("is she related to anyone famous?")).toBeNull();
  });
});

describe("is she sourced?", () => {
  test.each([
    ["is she sourced?", "", "sourced"],
    ["is this profile unsourced?", "", "unsourced"],
    ["does she have any sources?", "", "sourced"],
    ["are there any sources on Cook-8721?", "Cook-8721", "sourced"],
  ])("%s", (prompt, target, ask) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.PROFILE_SOURCES);
    expect(parseProfileSourcesPrompt(prompt)).toEqual({ target, countOnly: false, ask });
  });
  const sourced = "Born 1832.<ref>Baptism, Lilleshall</ref>\n== Sources ==\n<references />";
  test("yes or no first, by the question's polarity", () => {
    expect(buildSourcesAnswer({ label: "Ellen (Cook-8721)", bio: sourced, ask: "sourced" })).toBe("Yes, Ellen (Cook-8721) has 1 source in the biography:\n1. Baptism, Lilleshall");
    expect(buildSourcesAnswer({ label: "Ellen (Cook-8721)", bio: sourced, ask: "unsourced" })).toMatch(/^No, Ellen \(Cook-8721\) has 1 source/);
    expect(buildSourcesAnswer({ label: "Ellen (Cook-8721)", bio: "{{Unsourced}}\nBorn 1832.", ask: "unsourced" })).toBe(
      "Yes, Ellen (Cook-8721) has no sources in the biography: no <ref> citations and nothing under == Sources ==. The biography also has the {{Unsourced}} template."
    );
  });
  test("the list questions are unchanged", () => {
    expect(parseProfileSourcesPrompt("what sources does she have?")).toEqual({ target: "", countOnly: false });
    expect(buildSourcesAnswer({ label: "E", bio: sourced })).toBe("E has 1 source in the biography:\n1. Baptism, Lilleshall");
  });
});

describe("categories and research notes", () => {
  test.each([
    ["what categories is she in?", "categories"],
    ["what categories are on her profile?", "categories"],
    ["is she in any categories?", "categories"],
    ["list her categories", "categories"],
    ["does she have research notes?", "researchNotes"],
    ["are there research notes on her profile?", "researchNotes"],
    ["what do her research notes say?", "researchNotes"],
  ])("%s", (prompt, fact) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.PROFILE_FACT);
    expect(parseProfileFactPrompt(prompt)).toEqual({ owner: "", fact });
  });
  test("categories from getCategories, underscores as spaces", () => {
    const categories = ["Lloyds,_sailed_11_September_1841", "Motueka_Cemetery,_Motueka,_Tasman"];
    expect(buildProfileFactAnswer({}, "categories", "Ellen (Cook-8721)", { categories })).toBe(
      "Ellen (Cook-8721) is in 2 categories:\n- Lloyds, sailed 11 September 1841\n- Motueka Cemetery, Motueka, Tasman"
    );
    expect(buildProfileFactAnswer({}, "categories", "E", { categories: [] })).toBe("E isn't in any categories.");
    expect(buildProfileFactAnswer({}, "categories", "E", { categories: null })).toBe("I couldn't read the categories for E.");
  });
  const bio = "== Biography ==\nBorn 1832.\n\n== Research Notes ==\n* Two baptisms fit: see [[Cook-1|her cousin]].\n=== The 1841 census ===\nNot found.\n\n== Sources ==\n<references />";
  test("the text under Research Notes, sub-headings included, up to the next section", () => {
    expect(researchNotesText(bio)).toBe("Two baptisms fit: see her cousin.\n=== The 1841 census ===\nNot found.");
    expect(buildProfileFactAnswer({ bio }, "researchNotes", "E")).toBe("Yes, E has research notes:\nTwo baptisms fit: see her cousin.\n=== The 1841 census ===\nNot found.");
    expect(buildProfileFactAnswer({ bio: "== Biography ==\nBorn." }, "researchNotes", "E")).toBe("No, E's biography has no Research Notes section.");
    expect(buildProfileFactAnswer({ bio: "== Research Notes ==\n\n== Sources ==" }, "researchNotes", "E")).toBe("E's biography has a Research Notes heading, but nothing under it.");
    expect(buildProfileFactAnswer({}, "researchNotes", "E")).toBe("I couldn't read E's biography, so I can't tell. (It may be private.)");
  });
});

// Batch 3 (2026-10-14): questions about her children that needed the AI.
describe("did any of her children die young / emigrate?", () => {
  test.each([
    ["did any of her children die young?", { generation: 1, ageAtDeath: { max: 15 }, subjectText: "her children" }],
    ["how many of her children died young?", { generation: 1, ageAtDeath: { max: 15 } }],
    ["have any of my grandchildren died young", { generation: 2, ageAtDeath: { max: 15 }, subjectText: "my grandchildren" }],
    ["did any of her children live to 90?", { generation: 1, ageAtDeath: { min: 90 } }],
    ["were any of her children born in Ohio?", { generation: 1, location: "Ohio", locationField: "BirthLocation", subjectText: "her children" }],
    ["did any of her children emigrate?", { generation: 1, emigrated: true, subjectText: "her children" }],
    ["which of Ellen Cook's children emigrated?", { generation: 1, emigrated: true, subjectText: "Ellen Cook's children" }],
    ["how many of my grandchildren emigrated", { generation: 2, emigrated: true }],
    ["her children who emigrated", { generation: 1, emigrated: true }],
    // (subjectText: a named list is that person's, not the page person's)
    ["which of Ellen Cook's children died young?", { generation: 1, ageAtDeath: { max: 15 }, subjectText: "Ellen Cook's children" }],
  ])("%s", (prompt, params) => {
    const routed = routeChatPrompt(prompt);
    expect(routed.intent).toBe(ChatIntent.DESCENDANT_LIST);
    expect(routed.params).toMatchObject(params);
  });

  test("a yes/no question with nothing to filter on isn't a list ('did any of my grandchildren marry?' listed them all)", () => {
    expect(routeChatPrompt("did any of my grandchildren marry?").intent).not.toBe(ChatIntent.DESCENDANT_LIST);
  });

  test("did any of my ancestors emigrate?", () => {
    const routed = routeChatPrompt("did any of my ancestors emigrate?");
    expect(routed.intent).toBe(ChatIntent.ANCESTOR_LIST);
    expect(routed.params).toMatchObject({ emigrated: true });
  });

  test("a state or county is its country: Pennsylvania to Ohio isn't emigrating, Shropshire to Ontario is", () => {
    const row = (birthLocation, deathLocation) => ({ birthLocation, deathLocation });
    expect(isEmigrantRow(row("Philadelphia, Pennsylvania", "Columbus, Ohio, United States"), placeCountry)).toBe(false);
    expect(isEmigrantRow(row("Wem, Shropshire", "London, Ontario"), placeCountry)).toBe(true);
    expect(isEmigrantRow(row("Wem, Shropshire", ""), placeCountry)).toBe(false);
  });

  test("the list keeps only those born in one country who died in another, and says so", async () => {
    const people = {
      2: { Id: 2, Name: "Cook-2", BirthLocation: "Wem, Shropshire, England", DeathLocation: "Toronto, Ontario, Canada", Meta: { Degrees: 1 } },
      3: { Id: 3, Name: "Cook-3", BirthLocation: "Wem, Shropshire, England", DeathLocation: "Shrewsbury, Shropshire", Meta: { Degrees: 1 } },
      4: { Id: 4, Name: "Cook-4", BirthLocation: "Wem, Shropshire, England", DeathLocation: "", Meta: { Degrees: 1 } },
    };
    const handlers = createChatPeopleHandlers({
      ChatIntent,
      getLastStructuredResult: () => null,
      makeStandardProfileTable: (title, rows) => ({ title, rows }),
      getCurrentChatMode: () => "wt",
      WBE_CHAT_APP_ID: "test",
      normalizeText: (value) => String(value).toLowerCase(),
      promptRefersToUser: () => false,
      mapApiPersonToStandardRow: (person) => ({ wtid: person.Name, wtId: person.Name, id: person.Id, birthLocation: person.BirthLocation, deathLocation: person.DeathLocation }),
      getProfileSubjectRoot: () => ({ key: "Cook-1", wtId: "Cook-1", subjectType: "profile" }),
      formatSubjectLabel: () => "Ellen (Cook-1)",
      fetchPeoplePaged: jest.fn(async () => [null, null, people]),
    });
    const result = await handlers.tryHandleDescendantListPrompt({ generation: 1, relationshipLabel: "children", emigrated: true, subjectText: "her children" }, "did any of her children emigrate?");
    expect(result.message).toMatch(/born in one country and died in another for Ellen \(Cook-1\) \(1 found\)/);
    expect(result.table._chatMeta).toMatchObject({ emigrated: true });
    delete people[2];
    const none = await handlers.tryHandleDescendantListPrompt({ generation: 1, relationshipLabel: "children", emigrated: true }, "did any of her children emigrate?");
    expect(none).toBe("None of the 2 children for Ellen (Cook-1) were born in one country and died in another (1 has both places recorded).");
  });
});

describe("stepchildren", () => {
  test.each([
    ["who were her stepchildren?", { target: "" }],
    ["did she have any stepchildren?", { target: "" }],
    ["how many stepchildren did he have?", { target: "" }],
    ["list his stepsons and stepdaughters", { target: "" }],
    ["her step-children", { target: "" }],
    ["my stepchildren", { target: "me" }],
    ["Ellen Cook's stepchildren", { target: "Ellen Cook" }],
  ])("%s", (prompt, extra) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.PERSON_MARRIAGE);
    expect(parseMarriagePrompt(prompt)).toEqual({ parents: false, ask: "stepchildren", ...extra });
  });

  const person = { label: "Ellen Burton (Cook-1)", id: 1 };
  const child = (label, birth, fatherId, motherId) => ({ label, birth, fatherId, motherId });
  test("a spouse's children by someone else; one with no other parent may be her own", () => {
    const spouses = [
      {
        id: 10,
        spouseLabel: "William Burton (Burton-10)",
        children: [child("Mary Burton (Burton-11)", "1848-05-00", 10, 20), child("Ann Burton (Burton-12)", "1856-00-00", 10, 1), child("Tom Burton (Burton-13)", "", 10, 0)],
      },
      { id: 30, spouseLabel: "John Alley (Alley-30)", children: [] },
    ];
    expect(buildStepchildrenAnswer({ person, spouses })).toBe(
      "Ellen Burton (Cook-1) has 1 stepchild on WikiTree (a spouse's children by someone else):\n" +
        "- Mary Burton (Burton-11), born 1848-05: William Burton (Burton-10)'s child\n" +
        "One more child of William Burton (Burton-10) has no other parent recorded, so they may be Ellen Burton (Cook-1)'s own: Tom Burton (Burton-13)."
    );
  });
  test("none, and no spouse", () => {
    expect(buildStepchildrenAnswer({ person, spouses: [{ id: 10, spouseLabel: "W (B-10)", children: [child("A (B-11)", "", 10, 1)] }] })).toBe(
      "WikiTree has no children of W (B-10) by anyone other than Ellen Burton (Cook-1), so no stepchildren there."
    );
    expect(buildStepchildrenAnswer({ person, spouses: [] })).toBe("WikiTree has no spouse recorded for Ellen Burton (Cook-1), so no stepchildren there.");
  });
});

describe("children after a husband or wife died", () => {
  test.each([
    ["did she have any children after her first husband died?", { ordinal: 1 }],
    ["were any of her children born after her husband died?", {}],
    ["did he have children after his wife's death?", {}],
    ["how many children did she have after her second husband died?", { ordinal: 2 }],
    ["did Ellen Cook have any more children after her husband died?", { target: "Ellen Cook" }],
  ])("%s", (prompt, extra) => {
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.PERSON_MARRIAGE);
    expect(parseMarriagePrompt(prompt)).toEqual({ target: "", parents: false, ask: "childrenAfter", ...extra });
  });

  const person = { label: "Ellen Alley (Cook-1)", id: 1, death: "1900-01-01" };
  const marriages = [
    { spouseId: 10, spouseLabel: "William Burton (Burton-10)", spouseDeath: "1880-03-10" },
    { spouseId: 30, spouseLabel: "John Alley (Alley-30)", spouseDeath: "1910-01-01" },
  ];
  const child = (label, birth, fatherId) => ({ label, birth, fatherId, motherId: 1 });
  test("yes: who, and by whom; a child born after their own father's death says so", () => {
    const children = [child("Mary (Burton-11)", "1875-02-01", 10), child("Will (Burton-12)", "1880-09-20", 10), child("Jack (Alley-31)", "1883-00-00", 30), child("Sam (Alley-32)", "1880-00-00", 30)];
    expect(buildChildrenAfterDeathAnswer({ person, marriages, children, ordinal: 1 })).toBe(
      "Yes. 2 of Ellen Alley (Cook-1)'s 4 children on WikiTree were born after William Burton (Burton-10) died (1880-03-10):\n" +
        "- Will (Burton-12), born 1880-09-20, after William Burton (Burton-10)'s death\n" +
        "- Jack (Alley-31), born 1883, child of John Alley (Alley-30)\nSam (Alley-32) was born the same year, before or after."
    );
  });
  test("no, with the youngest's birth; no ordinal takes each spouse who died first", () => {
    const children = [child("Mary (Burton-11)", "1875-02-01", 10), child("Ann (Burton-13)", "", 10)];
    expect(buildChildrenAfterDeathAnswer({ person, marriages, children })).toBe(
      "No. None of Ellen Alley (Cook-1)'s 2 children on WikiTree was born after William Burton (Burton-10) died (1880-03-10); the youngest was born 1875-02-01. (1 has no birth date.)"
    );
    expect(buildChildrenAfterDeathAnswer({ person, marriages: [{ spouseId: 10, spouseLabel: "W (B-10)", spouseDeath: "" }], children })).toBe(
      "No death date is recorded for W (B-10), so I can't tell."
    );
    expect(buildChildrenAfterDeathAnswer({ person, marriages, children: [] })).toBe("Ellen Alley (Cook-1) has no children on WikiTree.");
  });
});
