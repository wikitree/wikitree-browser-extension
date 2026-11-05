// Ahnentafel numbers: root 1, parents 2 and 3, grandparents 4 through 7.
// API-derived values may be missing or invalid; those map to the root generation.
export function getGenerationFromAhnen(ahnen) {
  const numericAhnen = Number(ahnen);
  if (!Number.isFinite(numericAhnen) || numericAhnen < 2) {
    return 0;
  }

  return Math.floor(Math.log2(numericAhnen));
}

/**
 * Each ancestor's Ahnentafel number, walking up from `rootProfile` through `peopleById` (API profiles keyed by page Id):
 * a Map of Id → number. Breadth first, so with pedigree collapse a person keeps their lowest number.
 */
export function ahnenNumbers(rootProfile, peopleById = {}) {
  const ahnenById = new Map();
  const queue = [];
  const add = (id, ahnen) => {
    const key = String(id ?? "").trim();
    if (key) queue.push({ id: key, ahnen });
  };
  add(rootProfile?.Father, 2);
  add(rootProfile?.Mother, 3);
  while (queue.length) {
    const { id, ahnen } = queue.shift();
    if (ahnenById.has(id)) continue;
    ahnenById.set(id, ahnen);
    const profile = peopleById?.[id];
    if (!profile) continue;
    add(profile.Father, ahnen * 2);
    add(profile.Mother, ahnen * 2 + 1);
  }
  return ahnenById;
}
