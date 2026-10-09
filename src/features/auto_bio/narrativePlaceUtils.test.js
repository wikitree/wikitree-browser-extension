import {
  categoryMatchesPart,
  clearWikiLinks,
  configureWikiLinks,
  formatWikiLink,
  joinPlaceParts,
  linkablePartCount,
  placeLinkKey,
  placePartCandidates,
  placePartLookup,
  setWikiLink,
  splitPlace,
} from "./narrativePlaceUtils.js";
import { fullNarrativePlace, minimalPlace } from "./displayUtils.js";
import { loadUSStates } from "./usStatesStore.js";

beforeAll(loadUSStates);

const CALEDONIA = "Caledonia, Washington, Missouri, United States";

describe("linkablePartCount", () => {
  test("is all the parts but the highest-level one, and never the country", () => {
    expect(linkablePartCount(splitPlace(CALEDONIA))).toBe(2);
    expect(linkablePartCount(splitPlace("Caledonia, Missouri"))).toBe(1);
  });
  test("a place with one part besides the country links that part", () => {
    expect(linkablePartCount(splitPlace("Missouri, United States"))).toBe(1);
    expect(linkablePartCount(splitPlace("Missouri"))).toBe(1);
  });
});

describe("categoryMatchesPart", () => {
  test("matches the part, with or without the word County", () => {
    expect(categoryMatchesPart("Caledonia, Missouri", "Caledonia")).toBe(true);
    expect(categoryMatchesPart("Washington County, Missouri", "Washington")).toBe(true);
    expect(categoryMatchesPart("Saint Louis, Missouri", "St. Louis")).toBe(true);
  });
  test("does not match the category of another place", () => {
    expect(categoryMatchesPart("Washington County, Missouri", "Caledonia")).toBe(false);
    expect(categoryMatchesPart("Washington Township, Ohio", "Washington")).toBe(false);
  });
});

describe("placePartCandidates", () => {
  const parts = splitPlace(CALEDONIA);
  test("a US part between the first and the state is a county, with or without the word", () => {
    expect(placePartCandidates(parts, 1, true)).toEqual(["Washington County, Missouri"]);
    expect(placePartCandidates(splitPlace("Caledonia, Washington County, Missouri, United States"), 1, true)).toEqual([
      "Washington County, Missouri",
    ]);
  });
  test("the first part is named with the state, then its neighbour", () => {
    expect(placePartCandidates(parts, 0, true)).toEqual([
      "Caledonia, Missouri",
      "Caledonia, Washington",
      "Caledonia, Washington, Missouri",
    ]);
  });
  test("outside the US the bare name is the last resort", () => {
    const german = splitPlace("Dresden, Kreis Dresden, Sachsen, Deutschland");
    expect(placePartCandidates(german, 0, false)).toEqual([
      "Dresden, Sachsen",
      "Dresden, Kreis Dresden",
      "Dresden, Kreis Dresden, Sachsen",
      "Dresden",
    ]);
  });
  test("the highest-level part is only its own name", () => {
    expect(placePartCandidates(parts, 2, true)).toEqual(["Missouri"]);
  });
});

describe("placePartLookup and placeLinkKey", () => {
  const parts = splitPlace(CALEDONIA);
  test("a county in the middle of a US place is looked up with the word County", () => {
    expect(placePartLookup(parts, 1, true)).toBe("Washington County, Missouri, United States");
    expect(placeLinkKey(parts, 1)).toBe("Washington County, Missouri, United States");
  });
  test("the first part and the state are looked up as they are", () => {
    expect(placePartLookup(parts, 0, true)).toBe(CALEDONIA);
    expect(placePartLookup(parts, 2, true)).toBe("Missouri, United States");
  });
  test("so the city and the county of the same name have separate keys", () => {
    expect(placeLinkKey(splitPlace("Washington, Missouri, United States"), 0)).toBe(
      "Washington, Missouri, United States"
    );
  });
  test("outside the US nothing is a county", () => {
    expect(placePartLookup(splitPlace("Leeds, Yorkshire, England, United Kingdom"), 1, false)).toBe(
      "Yorkshire, England, United Kingdom"
    );
  });
});

describe("formatWikiLink", () => {
  test("formats each kind of target", () => {
    expect(formatWikiLink({ kind: "category", title: "Caledonia, Missouri" }, "Caledonia")).toBe(
      "[[:Category:Caledonia, Missouri|Caledonia]]"
    );
    expect(formatWikiLink({ kind: "wikipedia", title: "Caledonia, Missouri", lang: "en" }, "Caledonia")).toBe(
      "[[Wikipedia:Caledonia, Missouri|Caledonia]]"
    );
    expect(formatWikiLink({ kind: "wikipedia", title: "Berlin", lang: "de" }, "Berlin")).toBe(
      "[[Wikipedia:de:Berlin|Berlin]]"
    );
    expect(formatWikiLink(null, "x")).toBe("x");
  });
});

describe("places in the narrative", () => {
  afterEach(() => {
    window.autoBioOptions = undefined;
    window.usedPlaces = [];
    clearWikiLinks();
  });

  function linkTheParts() {
    configureWikiLinks({ language: "en" });
    setWikiLink(CALEDONIA, { kind: "category", title: "Caledonia, Missouri" });
    setWikiLink("Washington County, Missouri, United States", {
      kind: "wikipedia",
      title: "Washington County, Missouri",
    });
  }

  test("joinPlaceParts links the parts below the state, and not the state or the country", () => {
    linkTheParts();
    const parts = splitPlace(CALEDONIA);
    expect(joinPlaceParts(parts, [0, 1, 2, 3], true)).toBe(
      "[[:Category:Caledonia, Missouri|Caledonia]], [[Wikipedia:Washington County, Missouri|Washington]], Missouri, United States"
    );
  });

  test("with the options off a place is unchanged", () => {
    window.autoBioOptions = {};
    window.usedPlaces = [];
    expect(minimalPlace("Caledonia, Missouri, United States")).toBe("Caledonia, Missouri, United States");
    expect(fullNarrativePlace(CALEDONIA)).toBe(CALEDONIA);
  });

  test("minimalPlace still drops places already used", () => {
    window.autoBioOptions = {};
    window.usedPlaces = ["Missouri", "United States"];
    expect(minimalPlace("Caledonia, Missouri, United States")).toBe("Caledonia, Missouri");
  });

  test("minimalPlace and fullNarrativePlace link the parts", () => {
    linkTheParts();
    window.autoBioOptions = { wikiTreeLinks: true };
    window.usedPlaces = [];
    expect(minimalPlace(CALEDONIA)).toBe(
      "[[:Category:Caledonia, Missouri|Caledonia]], [[Wikipedia:Washington County, Missouri|Washington]], Missouri, United States"
    );
    window.autoBioOptions = { wikipediaLinks: true, fullLocations: true };
    expect(fullNarrativePlace(CALEDONIA)).toContain("[[:Category:Caledonia, Missouri|Caledonia]], ");
    expect(minimalPlace(CALEDONIA)).toContain("[[:Category:Caledonia, Missouri|Caledonia]], ");
  });
});
