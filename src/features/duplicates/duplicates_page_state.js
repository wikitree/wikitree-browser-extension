const EXCLUDED_MATCH_SECTION_HEADINGS = ["pending merges", "unmerged matches", "rejected matches"];

export function collectExcludedMatchIds(root = document) {
  const excludedIds = new Set();

  findExcludedMatchSections(root).forEach((section) => {
    section.querySelectorAll("ul a[href*='/wiki/']").forEach((link) => {
      const wtId = extractWikiTreeId(link.getAttribute("href") || link.href || "");
      if (wtId) {
        excludedIds.add(wtId);
      }
    });
  });

  return excludedIds;
}

export function filterExcludedDuplicatePairs(pairs, excludedMatchIds) {
  const excludedIds = new Set(Array.from(excludedMatchIds || []).map((wtId) => String(wtId).toLowerCase()));
  if (!excludedIds.size) {
    return Array.isArray(pairs) ? pairs : [];
  }

  return (Array.isArray(pairs) ? pairs : []).filter((pair) => {
    const person1 = String(pair?.person1 || "").toLowerCase();
    const person2 = String(pair?.person2 || "").toLowerCase();
    return !excludedIds.has(person1) && !excludedIds.has(person2);
  });
}

function findExcludedMatchSections(root) {
  return Array.from(root.querySelectorAll("h3"))
    .filter((heading) =>
      EXCLUDED_MATCH_SECTION_HEADINGS.some((sectionHeading) =>
        normalizeText(heading.textContent).startsWith(sectionHeading)
      )
    )
    .map((heading) => heading.closest(".col-lg-4, .col-md-4, .col"))
    .filter(Boolean);
}

function extractWikiTreeId(href) {
  const match = String(href || "").match(/\/wiki\/([^?#/]+)/i);
  return match ? decodeURIComponent(match[1]).trim() : "";
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
