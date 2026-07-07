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

function pushIfNotExists(array, item) {
  if (!array.some((existingItem) => existingItem.label === item.label && existingItem.url === item.url)) {
    array.push(item);
  }
}

export function buildTreeAppRecommendations(kind, wtId) {
  const normalizedKind = String(kind || "")
    .trim()
    .toLowerCase();
  const normalizedWtId = normalizeWtId(wtId);
  if (!normalizedWtId) {
    return [];
  }

  let recommendations = [];

  if (normalizedKind === "ancestors" || normalizedKind === "descendants") {
    const ancestorsOrDescendantsGroup = [
      { label: "Super Tree", url: buildWikiTreeAppsUrl(normalizedWtId, "superbig") },
      { label: "Slippy Tree", url: buildWikiTreeAppsUrl(normalizedWtId, "slippyTree") },
    ];
    ancestorsOrDescendantsGroup.forEach((item) => pushIfNotExists(recommendations, item));
  }

  if (normalizedKind === "ancestors") {
    const ancestorsGroup = [
      { label: "Ahnentafel Ancestor List", url: buildWikiTreeAppsUrl(normalizedWtId, "ahnentafel") },
      { label: "Ancestor Lines Explorer", url: buildWikiTreeAppsUrl(normalizedWtId, "ale") },
      { label: "Compact Couple Ancestors", url: buildWikiTreeAppsUrl(normalizedWtId, "cctree") },
      { label: "Fan Chart", url: buildWikiTreeAppsUrl(normalizedWtId, "fanchart") },
      { label: "Ancestor Explorer", url: buildAncestorExplorerUrl(normalizedWtId) },
    ];
    ancestorsGroup.forEach((item) => pushIfNotExists(recommendations, item));
  }

  if (normalizedKind === "cc7") {
    const cc7Group = [{ label: "CC7 Views", url: buildWikiTreeAppsUrl(normalizedWtId, "cc7") }];
    cc7Group.forEach((item) => pushIfNotExists(recommendations, item));
  }

  if (normalizedKind === "descendants") {
    const descendantsGroup = [
      { label: "Descendants", url: buildWikiTreeAppsUrl(normalizedWtId, "descendants") },
      { label: "Compact Couple Descendants", url: buildWikiTreeAppsUrl(normalizedWtId, "ccdtree") },
    ];
    descendantsGroup.forEach((item) => pushIfNotExists(recommendations, item));
  }

  return recommendations;
}
