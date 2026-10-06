import {
  clearWikiLinks,
  configureWikiLinks,
  formatWikiLink,
  indexesWithoutCountry,
  joinPlaceParts,
  omitCountry,
  placePartCandidates,
  setWikiLink,
  splitPlace,
} from "./narrativePlaceUtils.js";
import { minimalPlace } from "./displayUtils.js";

describe("omitCountry", () => {
  test("drops the country from the end", () => {
    expect(omitCountry("Caledonia, Washington County, Missouri, United States")).toBe(
      "Caledonia, Washington County, Missouri"
    );
    expect(omitCountry("Dublin, Ireland")).toBe("Dublin");
    expect(omitCountry("Leeds, Yorkshire, England, United Kingdom")).toBe("Leeds, Yorkshire");
  });

  test("keeps a country that is all there is", () => {
    expect(omitCountry("United States")).toBe("United States");
    expect(omitCountry("England, United Kingdom")).toBe("England");
  });

  test("leaves a place without a country alone", () => {
    expect(omitCountry("Caledonia, Missouri")).toBe("Caledonia, Missouri");
  });

  test("does not take the state of Georgia for a country", () => {
    expect(omitCountry("Atlanta, Georgia, United States")).toBe("Atlanta, Georgia");
    expect(omitCountry("Atlanta, Georgia")).toBe("Atlanta, Georgia");
  });
});

describe("placePartCandidates", () => {
  const parts = splitPlace("Caledonia, Washington County, Missouri, United States");
  test("names a part with the state, then its neighbour", () => {
    expect(placePartCandidates(parts, 0)).toEqual([
      "Caledonia, Missouri",
      "Caledonia, Washington County",
      "Caledonia, Washington County, Missouri",
    ]);
    expect(placePartCandidates(parts, 1)).toEqual(["Washington County, Missouri"]);
  });
  test("the highest-level part is only its own name", () => {
    expect(placePartCandidates(parts, 2)).toEqual(["Missouri"]);
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

describe("narrative places", () => {
  afterEach(() => {
    window.autoBioOptions = undefined;
    window.usedPlaces = [];
    clearWikiLinks();
  });

  test("joinPlaceParts links every shown part but the last", () => {
    configureWikiLinks({ language: "en" });
    const parts = splitPlace("Caledonia, Washington County, Missouri, United States");
    setWikiLink("Caledonia, Washington County, Missouri, United States", {
      kind: "wikipedia",
      title: "Caledonia, Missouri",
    });
    setWikiLink("Washington County, Missouri, United States", {
      kind: "wikipedia",
      title: "Washington County, Missouri",
    });
    expect(joinPlaceParts(parts, indexesWithoutCountry(parts), true)).toBe(
      "[[Wikipedia:Caledonia, Missouri|Caledonia]], [[Wikipedia:Washington County, Missouri|Washington County]], Missouri"
    );
  });

  test("minimalPlace is unchanged with the options off", () => {
    window.autoBioOptions = {};
    window.usedPlaces = [];
    expect(minimalPlace("Caledonia, Missouri, United States")).toBe("Caledonia, Missouri, United States");
  });

  test("minimalPlace leaves the country out, and a lone country in", () => {
    window.autoBioOptions = { omitCountry: true };
    window.usedPlaces = [];
    expect(minimalPlace("Caledonia, Missouri, United States")).toBe("Caledonia, Missouri");
    expect(minimalPlace("United States")).toBe("United States");
  });

  test("minimalPlace with full locations still leaves the country out", () => {
    window.autoBioOptions = { omitCountry: true, fullLocations: true };
    expect(minimalPlace("Caledonia, Missouri, United States")).toBe("Caledonia, Missouri");
  });

  test("minimalPlace links parts", () => {
    window.autoBioOptions = { omitCountry: true, wikiTreeLinks: true };
    window.usedPlaces = [];
    configureWikiLinks({ language: "en" });
    setWikiLink("Caledonia, Missouri, United States", { kind: "category", title: "Caledonia, Missouri" });
    expect(minimalPlace("Caledonia, Missouri, United States")).toBe(
      "[[:Category:Caledonia, Missouri|Caledonia]], Missouri"
    );
  });
});
