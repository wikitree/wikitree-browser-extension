// Ahnentafel numbers: root 1, parents 2 and 3, grandparents 4 through 7.
// API-derived values may be missing or invalid; those map to the root generation.
export function getGenerationFromAhnen(ahnen) {
  const numericAhnen = Number(ahnen);
  if (!Number.isFinite(numericAhnen) || numericAhnen < 2) {
    return 0;
  }

  return Math.floor(Math.log2(numericAhnen));
}
