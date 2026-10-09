import { canonicalChartOwner } from "./chat_chart_prompt";
import { fullWikiTreeName } from "./chat_fan_chart_data";
import { ancestorGenerationLabel, descendantWord } from "./chat_kin_labels";

export const FAMILY_MATRIX_FIELDS = "Id,Name,FirstName,MiddleName,RealName,LastNameAtBirth,LastNameCurrent,Gender,BirthDate,DeathDate,BirthLocation,DeathLocation,DataStatus,Father,Mother,IsLiving";

export function parseFamilyMatrixPrompt(prompt) {
  const match = String(prompt || "").trim().replace(/[.!?]+$/, "").match(/^(?:(?:show|open)(?: me)?\s+)?(?:(my|our|his|her|their|this profile's|[A-Za-z][A-Za-z'_ -]*-\d+['’]s)\s+)?(?:(?:family|kinship|relationship)\s+(?:map|matrix|dashboard|cards|relationships)|relationship\s+chart)$/i);
  if (!match) return null;
  const owner = canonicalChartOwner(match[1]);
  return { owner, ancestorPrompt: !owner ? "this profile's ancestors" : /^(my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors` };
}

const MAX_COLLATERAL_GENERATIONS = 8;

function ancestorPaths(id, byId, limit) {
  const paths = new Map([[String(id), 0]]);
  let frontier = [String(id)];
  for (let depth = 1; depth <= limit && frontier.length; depth++) {
    const next = [];
    frontier.forEach((key) => {
      const person = byId.get(key);
      [person?.Father, person?.Mother].filter((parent) => Number(parent)).forEach((parent) => {
        const key = String(parent);
        if (!paths.has(key)) { paths.set(key, depth); next.push(key); }
      });
    });
    frontier = next;
  }
  return paths;
}

// Lowercase labels (user, 2026-10-09): "1st cousins, once removed", not "· 1 generation younger".
const greatPrefix = (extra) => (extra <= 0 ? "" : extra === 1 ? "great-" : `${extra}× great-`);
const removedWord = (count) => (count === 1 ? "once" : count === 2 ? "twice" : `${count} times`);

function relationLabel(up, down) {
  if (!down) return ancestorGenerationLabel(up);
  if (!up) return down === 1 ? "children" : descendantWord(down, "").replace(/child$/, "children").toLowerCase();
  if (up === 1 && down === 1) return "siblings";
  if (down === 1) return `${greatPrefix(up - 2)}aunts / uncles`;
  if (up === 1) return `${greatPrefix(down - 2)}nieces / nephews`;
  const cousin = Math.min(up, down) - 1;
  const removed = Math.abs(up - down);
  return `${cousin}${cousin === 1 ? "st" : cousin === 2 ? "nd" : cousin === 3 ? "rd" : "th"} cousins${removed ? ` ${removedWord(removed)} removed` : ""}`;
}

export function buildFamilyMatrix(people, rootKey, ancestorDepth = 4, descendantDepth = 5) {
  const byId = new Map(Object.values(people || {}).filter(Boolean).map((person) => [String(person.Id), person]));
  const root = byId.get(String(rootKey)) || [...byId.values()].find((person) => person.Name === rootKey);
  if (!root) return null;
  const rootPaths = ancestorPaths(root.Id, byId, ancestorDepth);
  const groups = new Map();
  for (const person of byId.values()) {
    if (String(person.Id) === String(root.Id)) continue;
    const paths = ancestorPaths(person.Id, byId, Math.max(ancestorDepth, descendantDepth));
    const shared = [...rootPaths].filter(([id]) => paths.has(id)).map(([id, up]) => ({ id, up, down: paths.get(id) }));
    shared.sort((a, b) => (a.up + a.down) - (b.up + b.down) || Math.max(a.up, a.down) - Math.max(b.up, b.down));
    const closest = shared[0];
    if (!closest || closest.down > descendantDepth) continue;
    let label = relationLabel(closest.up, closest.down);
    if (closest.up === 1 && closest.down === 1 && root.Father && root.Mother && person.Father && person.Mother) {
      const common = [root.Father, root.Mother].filter((id) => [person.Father, person.Mother].some((parent) => String(id) === String(parent)));
      if (common.length === 1) label = "half siblings";
    }
    const key = `${closest.up}:${closest.down}:${label}`;
    if (!groups.has(key)) groups.set(key, { key, label, up: closest.up, down: closest.down, people: [] });
    groups.get(key).people.push({ id: person.Id, wtid: person.Name || "", name: fullWikiTreeName(person) || person.RealName || person.Name || "Private profile", gender: person.Gender || "", birth: person.BirthDate || "", death: person.DeathDate || "", birthStatus: person.DataStatus?.BirthDate || "", deathStatus: person.DataStatus?.DeathDate || "", birthPlace: person.BirthLocation || "", deathPlace: person.DeathLocation || "", living: Number(person.IsLiving) === 1 });
  }
  const cards = [...groups.values()].sort((a, b) => (b.up - b.down) - (a.up - a.down) || a.up - b.up);
  cards.forEach((card) => card.people.sort((a, b) => a.birth.localeCompare(b.birth) || a.name.localeCompare(b.name)));
  return { root, cards, ancestorDepth, descendantDepth, total: cards.reduce((sum, card) => sum + card.people.length, 0) };
}

// Related-key requests allow at most 100 keys. Paginate related profiles even when keys are a list.
export async function loadFamilyMatrixPeople(api, appId, rootKey, ancestorDepth, descendantDepth, progress) {
  const people = {};
  async function fetch(keys, options) {
    for (let start = 0; ; start += 1000) {
      const [status, , page] = await api.getPeople(appId, keys, FAMILY_MATRIX_FIELDS, { ...options, minGeneration: 0, start, limit: 1000 });
      if (status && !/maximum.*(?:profile|limit)|limit.*exceed/i.test(status)) throw new Error(status);
      Object.assign(people, page || {});
      const relatives = Object.values(page || {}).filter((person) => !keys.some((key) => String(key) === String(person.Id) || key === person.Name));
      if (relatives.length < 1000) break;
      progress?.(Object.keys(people).length);
    }
  }
  await fetch([String(rootKey)], { ancestors: ancestorDepth });
  // Collateral cards need descendants of shared ancestors, not only of the focus person.
  const seeds = [...new Set(Object.values(people).filter((person) => person.Id && Number(person.Id) > 0).map((person) => String(person.Id)))];
  // Deep ancestor views retain their direct ancestry; collateral branches start in the nearest
  // ancestors, as many generations as asked for (to MAX_COLLATERAL_GENERATIONS): 3rd cousins share
  // great-great-grandparents (4 up), 4th cousins need 5, and so on.
  const nearest = buildFamilyMatrix(people, rootKey, Math.min(ancestorDepth, MAX_COLLATERAL_GENERATIONS), descendantDepth);
  const ids = [nearest?.root?.Id, ...(nearest?.cards || []).filter((card) => card.down === 0).flatMap((card) => card.people.map((person) => person.id))].filter(Boolean).map(String);
  const targets = ids.length ? [...new Set(ids)] : seeds.slice(0, 100);
  for (let index = 0; index < targets.length; index += 20) {
    await fetch(targets.slice(index, index + 20), { descendants: descendantDepth });
    progress?.(Object.keys(people).length);
  }
  return people;
}
