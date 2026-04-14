function normalizeWtId(wtId) {
  return String(wtId || "").trim();
}

function buildWikiTreeAppsUrl(wtId, view) {
  const normalizedWtId = normalizeWtId(wtId);
  if (!normalizedWtId) {
    return "";
  }
  const encodedWtId = encodeURIComponent(normalizedWtId);
  return `https://www.wikitree.com/apps/${encodedWtId}#name=${encodedWtId}&view=${encodeURIComponent(view)}`;
}

function buildAncestorExplorerUrl(wtId) {
  const normalizedWtId = normalizeWtId(wtId);
  if (!normalizedWtId) {
    return "";
  }
  return `https://apps.wikitree.com/apps/ashley1950/ancestorexplorer/?id=${encodeURIComponent(normalizedWtId)}`;
}

export function buildTreeAppRecommendations(kind, wtId) {
  const normalizedKind = String(kind || "")
    .trim()
    .toLowerCase();
  const normalizedWtId = normalizeWtId(wtId);
  if (!normalizedWtId) {
    return [];
  }

  if (normalizedKind === "ancestors") {
    return [
      { label: "Ahnentafel Ancestor List", url: buildWikiTreeAppsUrl(normalizedWtId, "ahnentafel") },
      { label: "Ancestor Lines Explorer", url: buildWikiTreeAppsUrl(normalizedWtId, "ale") },
      { label: "Compact Couple Ancestors", url: buildWikiTreeAppsUrl(normalizedWtId, "cctree") },
      { label: "Fan Chart", url: buildWikiTreeAppsUrl(normalizedWtId, "fanchart") },
      { label: "Ancestor Explorer", url: buildAncestorExplorerUrl(normalizedWtId) },
    ];
  }

  if (normalizedKind === "cc7") {
    return [{ label: "CC7 Views", url: buildWikiTreeAppsUrl(normalizedWtId, "cc7") }];
  }

  if (normalizedKind === "descendants") {
    return [{ label: "Descendants", url: buildWikiTreeAppsUrl(normalizedWtId, "descendants") }];
  }

  return [];
}
