import { clearWikiLinks, configureWikiLinks, getWikiLink } from "./narrativePlaceUtils.js";
import {
  findWikipediaTarget,
  findWikiTreeTarget,
  pickArticle,
  resolvePlaceLinks,
  resolveTopicLinks,
  topicTitles,
} from "./wikiLinkResolver.js";

const page = (title, extra = {}) => ({ title, pageprops: { wikibase_item: "Q1" }, ...extra });

describe("pickArticle", () => {
  test("takes the first title that is an article with a Wikidata item", () => {
    const data = {
      query: {
        pages: [{ title: "Caledonia, Missouri", missing: true }, page("Caledonia, Washington County")],
      },
    };
    expect(pickArticle(data, ["Caledonia, Missouri", "Caledonia, Washington County"])).toEqual({
      title: "Caledonia, Washington County",
      qid: "Q1",
    });
  });

  test("skips disambiguation pages and pages without Wikidata", () => {
    const data = {
      query: {
        pages: [{ title: "Paris", pageprops: { wikibase_item: "Q2", disambiguation: "" } }, { title: "Nowhere" }],
      },
    };
    expect(pickArticle(data, ["Paris", "Nowhere"])).toBeNull();
  });

  test("follows redirects", () => {
    const data = {
      query: { redirects: [{ from: "Civil War", to: "American Civil War" }], pages: [page("American Civil War")] },
    };
    expect(pickArticle(data, ["Civil War"])?.title).toBe("American Civil War");
  });
});

describe("findWikipediaTarget", () => {
  test("uses the title in the profile's language from Wikidata", async () => {
    const fetchJson = jest.fn(async (url) =>
      url.includes("wikidata.org")
        ? { entities: { Q1: { sitelinks: { dewiki: { title: "Caledonia (Missouri)" } } } } }
        : { query: { pages: [page("Caledonia, Missouri")] } }
    );
    expect(await findWikipediaTarget(["Caledonia, Missouri"], "de", fetchJson)).toEqual({
      kind: "wikipedia",
      title: "Caledonia (Missouri)",
      lang: "de",
    });
  });

  test("falls back to the English article when there is none in the language", async () => {
    const fetchJson = jest.fn(async (url) =>
      url.includes("wikidata.org")
        ? { entities: { Q1: { sitelinks: {} } } }
        : { query: { pages: [page("Caledonia, Missouri")] } }
    );
    expect(await findWikipediaTarget(["Caledonia, Missouri"], "de", fetchJson)).toEqual({
      kind: "wikipedia",
      title: "Caledonia, Missouri",
      lang: "en",
    });
  });

  test("is null when nothing is found", async () => {
    expect(
      await findWikipediaTarget(["Nowhere"], "en", async () => ({
        query: { pages: [{ title: "Nowhere", missing: true }] },
      }))
    ).toBeNull();
    expect(await findWikipediaTarget(["Nowhere"], "en", async () => null)).toBeNull();
  });
});

describe("findWikiTreeTarget", () => {
  test("prefers a category over a project over a space", async () => {
    const exists = async (kind, title) => (kind === "Project" || kind === "Category") && title === "A, B";
    expect(await findWikiTreeTarget({ category: ["A, B"], project: ["A, B"], space: ["A, B"] }, exists)).toEqual({
      kind: "category",
      title: "A, B",
    });
    const noCategory = async (kind) => kind === "Space";
    expect(await findWikiTreeTarget({ category: ["A, B"], space: ["A, B"] }, noCategory)).toEqual({
      kind: "space",
      title: "A, B",
    });
  });
});

describe("resolvePlaceLinks", () => {
  beforeEach(() => {
    clearWikiLinks();
    configureWikiLinks({ language: "en" });
  });

  test("a WikiTree category wins over Wikipedia; the rest fall back to Wikipedia", async () => {
    const exists = async (kind, title) => kind === "Category" && title === "Caledonia, Missouri";
    const fetchJson = jest.fn(async () => ({ query: { pages: [page("Washington County, Missouri")] } }));
    await resolvePlaceLinks(["Caledonia, Washington County, Missouri, United States"], { exists, fetchJson });
    expect(getWikiLink("Caledonia, Washington County, Missouri, United States")).toEqual({
      kind: "category",
      title: "Caledonia, Missouri",
    });
    expect(getWikiLink("Washington County, Missouri, United States")).toEqual({
      kind: "wikipedia",
      title: "Washington County, Missouri",
      lang: "en",
    });
    // the state is left unlinked, so it is not looked up
    expect(getWikiLink("Missouri, United States")).toBeNull();
  });
});

describe("the two kinds of link are separate", () => {
  beforeEach(() => {
    clearWikiLinks();
    configureWikiLinks({ language: "en" });
  });
  const place = ["Caledonia, Missouri, United States"];

  test("with only WikiTree links on, Wikipedia is never asked", async () => {
    const fetchJson = jest.fn();
    await resolvePlaceLinks(place, { wikipedia: false, exists: async () => false, fetchJson });
    expect(fetchJson).not.toHaveBeenCalled();
    expect(getWikiLink("Caledonia, Missouri, United States")).toBeNull();
  });

  test("with only Wikipedia links on, WikiTree is never asked", async () => {
    const exists = jest.fn(async () => true);
    const fetchJson = async () => ({ query: { pages: [page("Caledonia, Missouri")] } });
    await resolvePlaceLinks(place, { wikiTree: false, exists, fetchJson });
    expect(exists).not.toHaveBeenCalled();
    expect(getWikiLink("Caledonia, Missouri, United States")?.kind).toBe("wikipedia");
  });
});

describe("resolveTopicLinks", () => {
  beforeEach(() => {
    clearWikiLinks();
    configureWikiLinks({ language: "en" });
  });

  test("topicTitles uses the Wikipedia name for the Civil War", () => {
    expect(topicTitles("Civil War")).toEqual(["American Civil War", "Civil War"]);
    expect(topicTitles("farmer")).toEqual(["Farmer"]);
  });

  test("looks a topic up under its lower-cased term", async () => {
    const fetchJson = async () => ({ query: { pages: [page("Farmer")] } });
    await resolveTopicLinks(["Farmer"], { exists: async () => false, fetchJson });
    expect(getWikiLink("farmer")).toEqual({ kind: "wikipedia", title: "Farmer", lang: "en" });
  });
});
