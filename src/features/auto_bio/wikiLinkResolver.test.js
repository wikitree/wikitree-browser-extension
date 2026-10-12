import { clearWikiLinks, configureWikiLinks, getWikiLink } from "./narrativePlaceUtils.js";
import { loadUSStates } from "./usStatesStore.js";
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
  test("prefers a project over a space", async () => {
    const exists = async () => true;
    expect(await findWikiTreeTarget({ project: ["A, B"], space: ["A, B"] }, exists)).toEqual({
      kind: "project",
      title: "A, B",
    });
    expect(await findWikiTreeTarget({ project: ["A, B"], space: ["A, B"] }, async (kind) => kind === "Space")).toEqual({
      kind: "space",
      title: "A, B",
    });
    expect(await findWikiTreeTarget({ project: ["A, B"] }, async () => false)).toBeNull();
  });
});

beforeAll(loadUSStates);

describe("resolvePlaceLinks", () => {
  const place = ["Caledonia, Washington, Missouri, United States"];
  const CALEDONIA = place[0];
  const WASHINGTON = "Washington County, Missouri, United States";
  // what Auto Categories finds: a county written without the word is still the county
  const categoryFor = async (location) =>
    ({ [CALEDONIA]: "Caledonia, Missouri", [WASHINGTON]: "Washington County, Missouri" }[location] || null);
  const wikipedia = (title) => async () => ({ query: { pages: [page(title)] } });

  beforeEach(() => {
    clearWikiLinks();
    configureWikiLinks({ language: "en" });
  });

  test("with WikiTree links on, a place gets its category (the county, not the city of the same name)", async () => {
    const fetchJson = jest.fn();
    await resolvePlaceLinks(place, { categoryFor, exists: async () => false, fetchJson, wikipedia: false });
    expect(getWikiLink(CALEDONIA)).toEqual({ kind: "category", title: "Caledonia, Missouri" });
    expect(getWikiLink(WASHINGTON)).toEqual({ kind: "category", title: "Washington County, Missouri" });
    // the state is left unlinked, so it is not looked up
    expect(getWikiLink("Missouri, United States")).toBeNull();
    expect(fetchJson).not.toHaveBeenCalled();
  });

  test("with only Wikipedia links on, the category says which article, and WikiTree pages are not linked", async () => {
    const exists = jest.fn(async () => true);
    const fetchJson = jest.fn(async (url) => {
      const asked = decodeURIComponent(url.match(/titles=([^&]*)/)[1]).split("|");
      expect(asked[0]).toMatch(/^(Caledonia, Missouri|Washington County, Missouri)$/);
      return { query: { pages: [page(asked[0])] } };
    });
    await resolvePlaceLinks(place, { categoryFor, exists, fetchJson, wikiTree: false });
    expect(exists).not.toHaveBeenCalled();
    expect(getWikiLink(WASHINGTON)).toEqual({ kind: "wikipedia", title: "Washington County, Missouri", lang: "en" });
  });

  test("a category for some other place is not taken for this part", async () => {
    // Caledonia has no category of its own; the lookup falls back to the county's
    const wrong = async () => "Washington County, Missouri";
    await resolvePlaceLinks(place, {
      categoryFor: wrong,
      exists: async () => false,
      fetchJson: wikipedia("Caledonia, Missouri"),
    });
    expect(getWikiLink(CALEDONIA)).toEqual({ kind: "wikipedia", title: "Caledonia, Missouri", lang: "en" });
  });

  test("without a category, a US county in the middle is asked for with the word County, and nothing else", async () => {
    const asked = [];
    const fetchJson = async (url) => {
      asked.push(decodeURIComponent(url.match(/titles=([^&]*)/)[1]));
      return { query: { pages: [] } };
    };
    await resolvePlaceLinks(place, { categoryFor: async () => null, exists: async () => false, fetchJson });
    expect(asked.find((titles) => titles.includes("Washington"))).toBe("Washington County, Missouri");
  });

  test("with neither kind on nothing is linked", async () => {
    await resolvePlaceLinks(place, {
      categoryFor,
      exists: async () => true,
      fetchJson: jest.fn(),
      wikiTree: false,
      wikipedia: false,
    });
    expect(getWikiLink(CALEDONIA)).toBeNull();
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

  test("an occupation with a WikiTree category links to it", async () => {
    await resolveTopicLinks(["Farmer"], {
      exists: async () => false,
      fetchJson: jest.fn(),
      categoryNameFor: (term) => (term === "farmer" ? "Farmers" : ""),
    });
    expect(getWikiLink("farmer")).toEqual({ kind: "category", title: "Farmers" });
  });

  test("a project page comes before Wikipedia, and only with WikiTree links on", async () => {
    const exists = async (kind) => kind === "Project";
    const fetchJson = async () => ({ query: { pages: [page("American Civil War")] } });
    await resolveTopicLinks(["Civil War"], { exists, fetchJson });
    expect(getWikiLink("civil war")).toEqual({ kind: "project", title: "American Civil War" });
    clearWikiLinks();
    await resolveTopicLinks(["Civil War"], { exists, fetchJson, wikiTree: false });
    expect(getWikiLink("civil war")?.kind).toBe("wikipedia");
  });

  test("looks a topic up under its lower-cased term", async () => {
    const fetchJson = async () => ({ query: { pages: [page("Farmer")] } });
    await resolveTopicLinks(["Farmer"], { exists: async () => false, fetchJson });
    expect(getWikiLink("farmer")).toEqual({ kind: "wikipedia", title: "Farmer", lang: "en" });
  });
});
