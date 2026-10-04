import { findWikiTreeIdOnWikidata } from "./chat_wikidata";

const entity = (id, label, wtId, born) => ({
  labels: { en: { value: label } },
  claims: {
    ...(wtId ? { P2949: [{ mainsnak: { datavalue: { value: wtId } } }] } : {}),
    ...(born ? { P569: [{ mainsnak: { datavalue: { value: { time: `+${born}-08-19T00:00:00Z` } } } }] } : {}),
  },
});
const ENTITIES = { Q1124: entity("Q1124", "Bill Clinton", "Blythe-6", 1946), Q2: entity("Q2", "Bill Clinton", null, 1946), Q3: entity("Q3", "John Smith", "Smith-1", 1580) };
const SEARCH = { "Bill Clinton": ["Q2", "Q1124"], "John Smith": ["Q3"] };

function fakeFetch(calls = []) {
  return async (url) => {
    const params = new URL(url).searchParams;
    calls.push(Object.fromEntries(params));
    const body =
      params.get("action") === "wbsearchentities"
        ? { search: (SEARCH[params.get("search")] || []).map((id) => ({ id })) }
        : { entities: Object.fromEntries(params.get("ids").split("|").map((id) => [id, ENTITIES[id]])) };
    return { ok: true, json: async () => body };
  };
}

describe("findWikiTreeIdOnWikidata", () => {
  test("the first result with a WikiTree ID and the AI's birth year", async () => {
    const calls = [];
    expect(await findWikiTreeIdOnWikidata(["Bill Clinton"], 1946, { fetchImpl: fakeFetch(calls) })).toEqual({ wtId: "Blythe-6", label: "Bill Clinton", qid: "Q1124" });
    expect(calls[0]).toMatchObject({ action: "wbsearchentities", search: "Bill Clinton", origin: "*" });
  });
  test("a different birth year → no match (a famous namesake isn't picked)", async () => {
    expect(await findWikiTreeIdOnWikidata(["John Smith"], 1950, { fetchImpl: fakeFetch() })).toBeNull();
  });
  test("no birth year, a one-word name, or nothing found → null without a search", async () => {
    const calls = [];
    expect(await findWikiTreeIdOnWikidata(["Bill Clinton"], null, { fetchImpl: fakeFetch(calls) })).toBeNull();
    expect(await findWikiTreeIdOnWikidata(["clinton"], 1946, { fetchImpl: fakeFetch(calls) })).toBeNull();
    expect(calls).toEqual([]);
    expect(await findWikiTreeIdOnWikidata(["Nobody Here"], 1946, { fetchImpl: fakeFetch() })).toBeNull();
  });
  test("tries the next name; a failure returns null", async () => {
    expect(await findWikiTreeIdOnWikidata(["William Blythe", "Bill Clinton"], "1946", { fetchImpl: fakeFetch() })).toMatchObject({ wtId: "Blythe-6" });
    const broken = async () => {
      throw new Error("offline");
    };
    expect(await findWikiTreeIdOnWikidata(["Bill Clinton"], 1946, { fetchImpl: broken })).toBeNull();
  });
});
