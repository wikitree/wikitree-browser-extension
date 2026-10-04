// Connection paths (2026-10-04): which step sits at the top of the climb. WikiTree's
// connection finder treats siblings as one step, so a cousin path climbs to a pair of
// siblings and comes down again without ever passing their parents, the common
// ancestors. These helpers find that pair; chat_connections.js fetches the parents and
// the diagram (ui.js) draws them above it.

const relationText = (person) => String(person?.pathType || "").toLowerCase();
const isUp = (person) => /parent|father|mother/.test(relationText(person));
const isDown = (person) => /child|son|daughter/.test(relationText(person));

/** The generation of each person on the path, relative to the first (up = -1). */
export function connectionGenerations(path) {
  const gens = [0];
  for (let i = 1; i < (path || []).length; i++) gens.push(gens[i - 1] + (isUp(path[i]) ? -1 : isDown(path[i]) ? 1 : 0));
  return gens;
}

/**
 * Indices k where path[k] is a sibling of path[k - 1] at the top of the path: reached by
 * climbing (or the path starts there) and left by going down (or the path ends there).
 */
export function topSiblingSteps(path) {
  const gens = connectionGenerations(path);
  const steps = [];
  for (let k = 1; k < (path || []).length; k++) {
    if (!/sibling|brother|sister/.test(relationText(path[k]))) continue;
    const climbedIn = k - 1 === 0 || gens[k - 2] > gens[k - 1];
    const goesDown = k === path.length - 1 || gens[k + 1] > gens[k];
    if (climbedIn && goesDown) steps.push(k);
  }
  return steps;
}

/** The parent ids two siblings share (fathers first). */
export function sharedParentIds(a, b) {
  return ["Father", "Mother"]
    .map((field) => Number(a?.[field]) || 0)
    .filter((id, index) => id && id === (Number(b?.[["Father", "Mother"][index]]) || 0));
}
