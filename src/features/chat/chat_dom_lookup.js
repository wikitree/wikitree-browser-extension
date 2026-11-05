import $ from "jquery";

function collectWikiIdsFromSelectors(selectors = []) {
  const ids = new Set();
  for (const sel of selectors) {
    $(sel).each((i, a) => {
      try {
        const href = $(a).attr("href") || "";
        const m = href.match(/\/wiki\/(.+)$/);
        if (m && m[1]) {
          const candidate = decodeURIComponent(m[1]).trim();
          if (/^[A-Za-z\-0-9_]+$/.test(candidate)) ids.add(candidate);
        }
      } catch (e) {
        /* ignore */
      }
    });
  }
  return Array.from(ids);
}

export function findSpouseProfileIdsFromDOM() {
  return collectWikiIdsFromSelectors(['a[href*="/wiki/"]', ".spouse a", '[itemprop="spouse"] a', ".spouse-name a"]);
}

export function findChildrenProfileIdsFromDOM() {
  return collectWikiIdsFromSelectors([
    'a[itemprop="children"][href*="/wiki/"]',
    'a[itemprop="child"][href*="/wiki/"]',
    '.children a[href*="/wiki/"]',
    '.child a[href*="/wiki/"]',
    'a[href*="/wiki/"] .child, .child a[href*="/wiki/"]',
  ]);
}

export function findSiblingProfileIdsFromDOM() {
  return collectWikiIdsFromSelectors([
    'a[itemprop="sibling"][href*="/wiki/"]',
    '.siblings a[href*="/wiki/"]',
    '.sibling a[href*="/wiki/"]',
    '#Siblings a[href*="/wiki/"]',
  ]);
}

export function findParentProfileIdsFromDOM() {
  return collectWikiIdsFromSelectors([
    'span[itemprop="parent"] a[href*="/wiki/"]',
    'a[itemprop="parent"][href*="/wiki/"]',
    '#Father a[href*="/wiki/"], #Mother a[href*="/wiki/"]',
    '.parent a[href*="/wiki/"]',
  ]);
}
