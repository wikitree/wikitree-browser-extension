/**
 * Finds the pages the narrative can link to for a place, a war or an occupation.
 *
 * A page on WikiTree (a category, project or space page) is preferred. If there is none, the
 * Wikipedia article is used, but only when it has a Wikidata item, and in the language of the
 * profile when the article exists in that language (otherwise the English article is used).
 *
 * The lookups are asynchronous, so they are done before the narrative is built. The results are
 * stored with setWikiLink and read back synchronously by joinPlaceParts and linkTerm.
 */
import { promiseWithTimeout } from "./asyncUtils.js";
import {
  getWikiLinkLanguage,
  hasWikiLink,
  indexesWithoutCountry,
  placePartCandidates,
  placePartKey,
  setWikiLink,
  splitPlace,
} from "./narrativePlaceUtils.js";

const LOOKUP_TIMEOUT = 8000;
const CONCURRENCY = 6;

/* Wikipedia names for things the narrative calls something else, or that are ambiguous. */
const TOPIC_ALIASES = {
  "civil war": "American Civil War",
  "revolutionary war": "American Revolutionary War",
  "war of 1812": "War of 1812",
  "world war i": "World War I",
  "world war ii": "World War II",
  "world war 1": "World War I",
  "world war 2": "World War II",
  "spanish-american war": "Spanish–American War",
  "mexican-american war": "Mexican–American War",
  "vietnam war": "Vietnam War",
  "korean war": "Korean War",
};

const wikiTreeExistsCache = new Map();

/* ---- Fetching ---- */

/* Wikipedia and Wikidata let any web page read their API when the request says origin=*, so this runs
from the page like the WikiTree lookups do and needs no extra permission for the extension. */
async function defaultFetchJson(url) {
  try {
    const response = await fetch(url, { credentials: "omit" });
    return response.ok ? await response.json() : null;
  } catch (error) {
    return null;
  }
}

async function defaultWikiTreeExists(kind, title) {
  const key = `${kind}:${title}`;
  if (wikiTreeExistsCache.has(key)) {
    return wikiTreeExistsCache.get(key);
  }
  let exists = false;
  try {
    const path = key.replace(/ /g, "_").replace(/[?#%&+]/g, encodeURIComponent);
    const response = await fetch(`https://www.wikitree.com/wiki/${path}`, { method: "HEAD" });
    exists = response.ok;
  } catch (error) {
    exists = false;
  }
  wikiTreeExistsCache.set(key, exists);
  return exists;
}

function withTimeout(promise, label) {
  return promiseWithTimeout(promise, LOOKUP_TIMEOUT, label).catch(() => null);
}

/* ---- Wikipedia and Wikidata ---- */

function apiUrl(host, params) {
  const query = Object.entries({ action: "query", format: "json", formatversion: "2", origin: "*", ...params })
    .map(([name, value]) => `${name}=${encodeURIComponent(value)}`)
    .join("&");
  return `https://${host}/w/api.php?${query}`;
}

/**
 * Of the titles asked for, the first (in the order given) that is an article with a Wikidata item and is
 * not a disambiguation page. Redirects and title normalization are followed.
 */
export function pickArticle(data, titles) {
  const query = data?.query;
  if (!query?.pages) {
    return null;
  }
  const finalTitle = new Map();
  titles.forEach((title) => finalTitle.set(title, title));
  (query.normalized || []).forEach(({ from, to }) => finalTitle.set(from, to));
  (query.redirects || []).forEach(({ from, to }) => {
    finalTitle.forEach((value, key) => {
      if (value === from) {
        finalTitle.set(key, to);
      }
    });
  });
  for (const title of titles) {
    const page = query.pages.find((p) => p.title === finalTitle.get(title));
    const props = page?.pageprops;
    if (page && !page.missing && props?.wikibase_item && props.disambiguation === undefined) {
      return { title: page.title, qid: props.wikibase_item };
    }
  }
  return null;
}

async function findArticle(wiki, titles, fetchJson) {
  const data = await withTimeout(
    fetchJson(
      apiUrl(`${wiki}.wikipedia.org`, {
        redirects: "1",
        prop: "pageprops",
        ppprop: "wikibase_item|disambiguation",
        titles: titles.join("|"),
      })
    ),
    `Wikipedia lookup (${wiki})`
  );
  return pickArticle(data, titles);
}

async function titleInLanguage(qid, language, fetchJson) {
  const site = `${language.replace(/-/g, "_")}wiki`;
  const data = await withTimeout(
    fetchJson(
      `https://www.wikidata.org/w/api.php?action=wbgetentities&format=json&origin=*&props=sitelinks&sitefilter=${encodeURIComponent(
        site
      )}&ids=${encodeURIComponent(qid)}`
    ),
    "Wikidata lookup"
  );
  return data?.entities?.[qid]?.sitelinks?.[site]?.title || null;
}

/**
 * @param {string[]} titles Wikipedia titles to try, most likely first
 * @param {string} language the language of the profile
 * @returns {Promise<{kind: "wikipedia", title: string, lang: string}|null>}
 */
export async function findWikipediaTarget(titles, language, fetchJson = defaultFetchJson) {
  const wikis = [...new Set(["en", language])];
  for (const wiki of wikis) {
    const article = await findArticle(wiki, titles, fetchJson);
    if (!article) {
      continue;
    }
    if (wiki === language) {
      return { kind: "wikipedia", title: article.title, lang: language };
    }
    const local = await titleInLanguage(article.qid, language, fetchJson);
    return local
      ? { kind: "wikipedia", title: local, lang: language }
      : { kind: "wikipedia", title: article.title, lang: wiki };
  }
  return null;
}

/* ---- WikiTree ---- */

/**
 * @param {{category?: string[], project?: string[], space?: string[]}} candidates page names by kind
 * @returns {Promise<{kind: string, title: string}|null>} the first page that exists, categories first
 */
export async function findWikiTreeTarget(candidates, exists = defaultWikiTreeExists) {
  for (const kind of ["category", "project", "space"]) {
    for (const title of candidates[kind] || []) {
      const prefix = kind[0].toUpperCase() + kind.slice(1);
      if (await withTimeout(exists(prefix, title), `WikiTree ${prefix} lookup`)) {
        return { kind, title };
      }
    }
  }
  return null;
}

/* ---- Putting it together ---- */

async function runLimited(items, worker) {
  const queue = [...items];
  const runners = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      await worker(queue.shift());
    }
  });
  await Promise.all(runners);
}

async function resolveOnce(key, find) {
  if (hasWikiLink(key)) {
    return;
  }
  try {
    setWikiLink(key, await find());
  } catch (error) {
    setWikiLink(key, null);
  }
}

/**
 * Look up the links for the parts of some places. The highest-level part of a place is not linked
 * (unless it is the only part), so it is not looked up either.
 *
 * @param {string[]} places
 * @param {object} [deps] `wikiTree` and `wikipedia` (both default true) say which kinds of page to look for;
 * `fetchJson` and `exists` replace the network calls, for tests
 */
export async function resolvePlaceLinks(places, deps = {}) {
  const language = getWikiLinkLanguage();
  const fetchJson = deps.fetchJson || defaultFetchJson;
  const exists = deps.exists || defaultWikiTreeExists;
  const wikiTree = deps.wikiTree !== false;
  const findOnWikipedia = async (titles) =>
    deps.wikipedia !== false ? findWikipediaTarget(titles, language, fetchJson) : null;
  const jobs = [];
  const seen = new Set();

  [...new Set(places.filter(Boolean))].forEach((place) => {
    const parts = splitPlace(place);
    const core = indexesWithoutCountry(parts);
    // The highest-level part shown is left unlinked, so only the parts below it are looked up.
    const lastLinked = core.length === 1 ? 0 : core.length - 2;
    for (let index = 0; index <= lastLinked; index++) {
      const key = placePartKey(parts, index);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      const names = placePartCandidates(parts, index);
      jobs.push({ key, names });
    }
  });

  await runLimited(jobs, ({ key, names }) =>
    resolveOnce(key, async () => {
      /* Space pages are anyone's to name, so a bare "Farmer" or "Missouri" could be an unrelated page.
      Only the qualified names ("Caledonia, Missouri") are tried as project and space pages. */
      const qualified = names.filter((name) => name.includes(","));
      const onWikiTree = wikiTree
        ? await findWikiTreeTarget({ category: names, project: qualified, space: qualified }, exists)
        : null;
      return onWikiTree || findOnWikipedia(names);
    })
  );
}

/** The Wikipedia titles to try for a topic such as a war or an occupation. */
export function topicTitles(term) {
  const clean = String(term || "")
    .replace(/^the\s+/i, "")
    .trim();
  if (!clean) {
    return [];
  }
  const alias = TOPIC_ALIASES[clean.toLowerCase()];
  const capitalized = clean[0].toUpperCase() + clean.slice(1);
  return [...new Set([alias, capitalized].filter(Boolean))];
}

/**
 * Look up the links for topics (wars, occupations). The key each is stored under is the term, lower-cased,
 * which is what linkTerm is given.
 */
export async function resolveTopicLinks(terms, deps = {}) {
  const language = getWikiLinkLanguage();
  const fetchJson = deps.fetchJson || defaultFetchJson;
  const exists = deps.exists || defaultWikiTreeExists;
  const wikiTree = deps.wikiTree !== false;
  const findOnWikipedia = async (titles) =>
    deps.wikipedia !== false ? findWikipediaTarget(titles, language, fetchJson) : null;
  const unique = [
    ...new Set(
      terms
        .map((term) =>
          String(term || "")
            .trim()
            .toLowerCase()
        )
        .filter(Boolean)
    ),
  ];

  await runLimited(unique, (term) =>
    resolveOnce(term, async () => {
      const titles = topicTitles(term);
      if (!titles.length) {
        return null;
      }
      // Space pages are anyone's to name ("Space:Farmer" is a stranger's page), so only project pages count.
      const onWikiTree = wikiTree ? await findWikiTreeTarget({ project: titles }, exists) : null;
      return onWikiTree || findOnWikipedia(titles);
    })
  );
}
