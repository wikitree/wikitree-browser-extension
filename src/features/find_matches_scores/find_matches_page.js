/*
Created By: Ian Beacall (Beacall-6)

Reading the Special:FindMatches results out of the page.

Kept apart from the rest of the feature so it can be tested against saved copies of the
page: WikiTree's markup here is the one thing this feature cannot control, and a silent
change to it would otherwise just make the table quietly disappear.
*/

import $ from "jquery";

/**
 * The page shows one block per watchlist profile searched: a "Possible matches for X"
 * paragraph followed by a list of candidates. Returns one entry per block.
 */
export function readResultBlocks() {
  const blocks = [];

  $("section#Results > div").each((_, element) => {
    const container = $(element);
    const anchorWtId = wtIdFromElement(container.children("p").first());
    if (!anchorWtId) {
      return;
    }

    const candidates = [];
    container.find("> ul > li").each((__, listItem) => {
      const item = $(listItem);
      const wtId = wtIdFromElement(item);
      if (!wtId || wtId === anchorWtId) {
        return;
      }
      candidates.push({
        wtId,
        managedBy: item
          .find("small")
          .filter((___, small) => $(small).text().trim().startsWith("Managed by"))
          .first()
          .html(),
        compareUrl: item.find('a[href*="Special:MergePerson"]').first().attr("href") || "",
      });
    });

    if (candidates.length) {
      blocks.push({ container, anchorWtId, candidates });
    }
  });

  return blocks;
}

/** The WikiTree ID from a result's `<span class="mono small">`, falling back to its profile link. */
export function wtIdFromElement(element) {
  const monoText = element.find("span.mono.small").first().text().trim();
  if (monoText) {
    return monoText;
  }

  const href = element.find('a[href^="/wiki/"]').first().attr("href") || "";
  return decodeURIComponent(href.replace("/wiki/", "")).trim();
}

export function collectWtIds(blocks) {
  const wtIds = blocks.flatMap((block) => [block.anchorWtId, ...block.candidates.map((candidate) => candidate.wtId)]);
  return [...new Set(wtIds)];
}
