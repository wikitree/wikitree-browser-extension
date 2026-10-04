// Ancestor migration map data (2026-10-03, the "Wow!" visuals). From the fan
// chart's Ahnentafel slots: each ancestor's birthplace becomes a place (a
// country, or a state/province/nation for the US, Canada, Australia and the
// UK, where a country dot would hide every move), and each parent → child pair
// born in different places becomes a move. The d3 map is chat_migration_map.js.

import { getCountryFromLocation } from "./chat_place_country";
import { yearOf } from "./chat_chart_common";
import { generationOfSlot } from "./chat_fan_chart_data";
import { cachedPoint } from "./chat_geocode";

/** [longitude, latitude] for the sub-national places the map shows separately. */
export const REGION_POINTS = {
  // United Kingdom and Ireland
  England: [-1.5, 52.6],
  Scotland: [-4.2, 56.6],
  Wales: [-3.7, 52.3],
  "Northern Ireland": [-6.7, 54.6],
  Ireland: [-8, 53.2],
  // United States
  Alabama: [-86.8, 32.8],
  Alaska: [-152, 64],
  Arizona: [-111.7, 34.3],
  Arkansas: [-92.4, 34.9],
  California: [-119.5, 37.2],
  Colorado: [-105.5, 39],
  Connecticut: [-72.7, 41.6],
  Delaware: [-75.5, 39],
  Florida: [-81.7, 28.6],
  Georgia: [-83.4, 32.7],
  Hawaii: [-157, 20.8],
  Idaho: [-114.6, 44.4],
  Illinois: [-89.2, 40],
  Indiana: [-86.3, 39.9],
  Iowa: [-93.5, 42.1],
  Kansas: [-98.4, 38.5],
  Kentucky: [-85.3, 37.5],
  Louisiana: [-92, 31],
  Maine: [-69.2, 45.4],
  Maryland: [-76.8, 39],
  Massachusetts: [-71.8, 42.3],
  Michigan: [-84.7, 43.6],
  Minnesota: [-94.3, 46.3],
  Mississippi: [-89.7, 32.7],
  Missouri: [-92.5, 38.4],
  Montana: [-109.6, 47],
  Nebraska: [-99.8, 41.5],
  Nevada: [-116.6, 39.3],
  "New Hampshire": [-71.6, 43.7],
  "New Jersey": [-74.7, 40.1],
  "New Mexico": [-106.1, 34.4],
  "New York": [-75.5, 42.9],
  "North Carolina": [-79.4, 35.5],
  "North Dakota": [-100.5, 47.5],
  Ohio: [-82.8, 40.3],
  Oklahoma: [-97.5, 35.6],
  Oregon: [-120.5, 43.9],
  Pennsylvania: [-77.6, 40.9],
  "Rhode Island": [-71.5, 41.7],
  "South Carolina": [-80.9, 33.9],
  "South Dakota": [-100.2, 44.4],
  Tennessee: [-86.3, 35.8],
  Texas: [-99.3, 31.5],
  Utah: [-111.7, 39.3],
  Vermont: [-72.7, 44],
  Virginia: [-78.8, 37.5],
  Washington: [-120.4, 47.4],
  "West Virginia": [-80.6, 38.6],
  Wisconsin: [-89.8, 44.6],
  Wyoming: [-107.5, 43],
  // Canada
  Ontario: [-80, 45],
  Quebec: [-72, 47],
  "Nova Scotia": [-63.5, 45],
  "New Brunswick": [-66, 46.5],
  "Prince Edward Island": [-63.3, 46.3],
  Newfoundland: [-56, 49],
  Manitoba: [-97.5, 50.5],
  Saskatchewan: [-106, 52],
  Alberta: [-114, 53],
  "British Columbia": [-123, 50],
  // Australia
  "New South Wales": [147, -32.5],
  Victoria: [144.5, -37],
  Queensland: [145, -22],
  "South Australia": [137, -32],
  "Western Australia": [118, -28],
  Tasmania: [146.6, -42],
  "Northern Territory": [133, -19],
};

const SPLIT_COUNTRIES = new Set(["United States", "Canada", "Australia"]);
const UK_AND_IRELAND = new Set(["England", "Scotland", "Wales", "Northern Ireland", "Ireland"]);
const CANADIAN_PROVINCES = new Set(["Ontario", "Quebec", "Nova Scotia", "New Brunswick", "Prince Edward Island", "Newfoundland", "Manitoba", "Saskatchewan", "Alberta", "British Columbia"]);
const AUSTRALIAN_STATES = new Set(["New South Wales", "Victoria", "Queensland", "South Australia", "Western Australia", "Tasmania", "Northern Territory"]);
const REGION_NAMES = Object.keys(REGION_POINTS);
// Colonial names: "Plymouth Colony", "Massachusetts Bay Colony", "Province of New York".
const COLONY_ALIASES = { "plymouth colony": "Massachusetts", "massachusetts bay colony": "Massachusetts", "new netherland": "New York" };

function regionInParts(parts) {
  for (let index = parts.length - 1; index >= 0; index -= 1) {
    const part = parts[index]
      .replace(/^(?:colony|province|state|commonwealth)\s+of\s+/i, "")
      .replace(/\s+(?:colony|province|territory)$/i, "")
      .trim();
    const alias = COLONY_ALIASES[parts[index].toLowerCase()];
    if (alias) return alias;
    const match = REGION_NAMES.find((name) => name.toLowerCase() === part.toLowerCase());
    if (match && !UK_AND_IRELAND.has(match)) return match;
  }
  return "";
}

/** The map place for a WikiTree location: {key, country} or null. */
export function placeRegion(location) {
  const parts = String(location || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (!parts.length) return null;
  const country = getCountryFromLocation(location);
  if (REGION_POINTS[country] && !SPLIT_COUNTRIES.has(country)) return { key: country, country };
  const region = regionInParts(parts);
  if (region) {
    const regionCountry = AUSTRALIAN_STATES.has(region) ? "Australia" : CANADIAN_PROVINCES.has(region) ? "Canada" : "United States";
    return { key: region, country: regionCountry };
  }
  return country ? { key: country, country } : null;
}

/** "Zaccheus Roberts (1795–1867)" for the map's tips. */
export function migrationPersonLabel(person) {
  const first = String(person?.name || person?.wtid || "").trim();
  const lnab = String(person?.lnab || "").trim();
  const full = lnab && !first.split(/\s+/).includes(lnab) ? `${first} ${lnab}` : first;
  const born = yearOf(person?.birth);
  const died = yearOf(person?.death);
  return born || died ? `${full} (${born || "?"}–${died || ""})` : full;
}

/**
 * The map place for a location, at town level when it has been looked up
 * (pointFor: chat_geocode cachedPoint), else placeRegion's. A town is
 * {key: "Wem", country, point}; two towns of one name get their county
 * ("Newport (Shropshire)"). names: Map name → point id, shared across one map.
 */
export function placeOf(location, pointFor = cachedPoint, names = new Map()) {
  const region = placeRegion(location);
  const town = pointFor ? pointFor(location) : null;
  if (!town?.point || !town.name) return region;
  const id = town.point.join(",");
  let key = town.name;
  if (names.has(key) && names.get(key) !== id) key = town.area ? `${town.name} (${town.area})` : `${town.name} (${id})`;
  if (!names.has(key)) names.set(key, id);
  return { key, country: region?.country || town.country || "", point: town.point, region: region?.key || "" };
}

// "England" → "Worcester, Worcestershire, England" or "Shropshire" → "Shrewsbury,
// Shropshire" is one place written with more or less detail, not a move: the map
// drew an arrow from mid-England to Worcester (live, 2026-10-04).
function placeParts(location) {
  return String(location || "")
    .toLowerCase()
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/** True when one birthplace only repeats the wider places of the other. */
export function isSamePlaceVaguer(left, right) {
  const a = placeParts(left);
  const b = placeParts(right);
  if (!a.length || !b.length || a.length === b.length) return false;
  const [short, long] = a.length < b.length ? [a, b] : [b, a];
  return short.every((part) => long.includes(part));
}

/**
 * slots: from buildFanSlots. Returns {places: [{key, country, count, names}],
 * flows: [{from, to, count, firstYear, generation, examples: [{parent, child, year}]}],
 * moves, placed, unplaced} with flows oldest first.
 */
export function buildMigration(slots, pointFor = cachedPoint) {
  const places = new Map();
  const regionOf = [];
  const names = new Map();
  let unplaced = 0;
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 1) return;
    const region = placeOf(person.birthLocation, pointFor, names);
    regionOf[slot] = region;
    if (!region) {
      unplaced += 1;
      return;
    }
    if (!places.has(region.key)) places.set(region.key, { ...region, count: 0, names: [], people: [], firstYear: null, locations: [] });
    const place = places.get(region.key);
    place.count += 1;
    // (the earliest birth there, for the map's year slider)
    const born = yearOf(person.birth);
    if (born && (!place.firstYear || born < place.firstYear)) place.firstYear = born;
    if (place.names.length < 6) place.names.push(migrationPersonLabel(person));
    if (place.people.length < 15) place.people.push({ label: migrationPersonLabel(person), wtid: person.wtid || "" });
    if (place.locations.length < 3 && !place.locations.includes(person.birthLocation)) place.locations.push(person.birthLocation);
  });
  const flows = new Map();
  let moves = 0;
  (slots || []).forEach((parent, slot) => {
    if (!parent || slot < 2) return;
    const child = slots[Math.floor(slot / 2)];
    const from = regionOf[slot];
    const to = regionOf[Math.floor(slot / 2)];
    if (!child || !from || !to || from.key === to.key) return;
    if (isSamePlaceVaguer(parent.birthLocation, child.birthLocation)) return;
    moves += 1;
    const id = `${from.key}→${to.key}`;
    if (!flows.has(id)) flows.set(id, { from: from.key, to: to.key, count: 0, firstYear: null, generation: 0, examples: [] });
    const flow = flows.get(id);
    flow.count += 1;
    flow.generation = Math.max(flow.generation, generationOfSlot(slot));
    const year = yearOf(child.birth);
    if (year && (!flow.firstYear || year < flow.firstYear)) flow.firstYear = year;
    if (flow.examples.length < 8) flow.examples.push({ parent: migrationPersonLabel(parent), child: migrationPersonLabel(child), year, parentWtid: parent.wtid || "", childWtid: child.wtid || "" });
  });
  const sortedFlows = [...flows.values()].sort(
    (a, b) => (a.firstYear ?? 9999) - (b.firstYear ?? 9999) || b.generation - a.generation || b.count - a.count
  );
  const placeList = [...places.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return withRefine(
    { places: placeList, flows: sortedFlows, moves, placed: placeList.reduce((sum, place) => sum + place.count, 0), unplaced },
    (slots || []).filter((person, slot) => person && slot >= 1).map((person) => person.birthLocation),
    (nextPointFor) => buildMigration(slots, nextPointFor)
  );
}

// The map refines itself to towns as they're looked up: it needs the
// birthplaces (oldest last) and a way to rebuild. Not enumerable, so tests
// comparing the shape don't see them.
function withRefine(migration, locations, refine) {
  Object.defineProperty(migration, "locations", { value: locations.filter(Boolean) });
  Object.defineProperty(migration, "refine", { value: refine });
  return migration;
}

/**
 * The same shape as buildMigration, for descendants (2026-10-03): each parent → child
 * born in a different place is a move, walking down the descendant tree
 * (chat_descendant_chart_data buildDescendantTree: {person, children}).
 */
export function buildDescendantMigration(tree, pointFor = cachedPoint) {
  const places = new Map();
  const flows = new Map();
  const names = new Map();
  const locations = [];
  let unplaced = 0;
  let moves = 0;
  const visit = (node, parentNode, parentRegion) => {
    const person = node.person || {};
    const region = placeOf(person.birthLocation, pointFor, names);
    locations.push(person.birthLocation);
    if (!region) unplaced += 1;
    else {
      if (!places.has(region.key)) places.set(region.key, { ...region, count: 0, names: [], people: [], firstYear: null, locations: [] });
      const place = places.get(region.key);
      place.count += 1;
      if (place.names.length < 6) place.names.push(migrationPersonLabel(person));
      if (place.people.length < 15) place.people.push({ label: migrationPersonLabel(person), wtid: person.wtid || "" });
      if (place.locations.length < 3 && !place.locations.includes(person.birthLocation)) place.locations.push(person.birthLocation);
      const born = yearOf(person.birth);
      if (born && (!place.firstYear || born < place.firstYear)) place.firstYear = born;
    }
    if (parentRegion && region && parentRegion.key !== region.key && !isSamePlaceVaguer(parentNode?.person?.birthLocation, person.birthLocation)) {
      moves += 1;
      const id = `${parentRegion.key}→${region.key}`;
      if (!flows.has(id)) flows.set(id, { from: parentRegion.key, to: region.key, count: 0, firstYear: null, generation: 0, examples: [] });
      const flow = flows.get(id);
      flow.count += 1;
      flow.generation = Math.max(flow.generation, node.depth || 0);
      const year = yearOf(person.birth);
      if (year && (!flow.firstYear || year < flow.firstYear)) flow.firstYear = year;
      if (flow.examples.length < 8) flow.examples.push({ parent: migrationPersonLabel(parentNode.person), child: migrationPersonLabel(person), year, parentWtid: parentNode.person?.wtid || "", childWtid: person.wtid || "" });
    }
    // (an unplaced child passes on its parent's place, so a gap doesn't hide a move)
    (node.children || []).forEach((child) => visit(child, region ? node : parentNode, region || parentRegion));
  };
  if (tree) visit(tree, null, null);
  const sortedFlows = [...flows.values()].sort((a, b) => (a.firstYear ?? 9999) - (b.firstYear ?? 9999) || b.count - a.count);
  const placeList = [...places.values()].sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
  return withRefine(
    { places: placeList, flows: sortedFlows, moves, placed: placeList.reduce((sum, place) => sum + place.count, 0), unplaced },
    locations,
    (nextPointFor) => buildDescendantMigration(tree, nextPointFor)
  );
}

/** "Cook-8721's descendants were born in 7 places…" */
export function buildDescendantMigrationSummary(migration, ownerText) {
  if (!migration?.places?.length) return `${ownerText} descendants have no birthplaces recorded to map.`;
  const owner = ownerText === "Your" ? "your" : ownerText;
  const top = migration.places.slice(0, 5).map((place) => `${place.key} (${place.count})`);
  const lines = [`${ownerText} descendants were born in ${migration.places.length} place${migration.places.length === 1 ? "" : "s"}: ${top.join(", ")}${migration.places.length > 5 ? ", …" : ""}.`];
  if (migration.flows.length) {
    const biggest = [...migration.flows].sort((a, b) => b.count - a.count)[0];
    const first = migration.flows[0];
    lines.push(`The biggest move: ${biggest.from} → ${biggest.to} (${biggest.count}).${first.firstYear ? ` The first: ${first.from} → ${first.to}, by ${first.firstYear}.` : ""}`);
    const latest = migration.places.filter((place) => place.firstYear).sort((a, b) => b.firstYear - a.firstYear)[0];
    if (latest && latest.key !== migration.places[0].key) lines.push(`The newest place for ${owner} family: ${latest.key}, from ${latest.firstYear}.`);
  } else {
    lines.push("No parent and child were born in different places.");
  }
  return lines.join("\n");
}

/**
 * "In 1850, 9 of your ancestors were alive…": who was alive that year (by their dates;
 * no death date counts as alive up to 90), and where they were born, then where they died.
 */
export function buildMigrationYearSummary(slots, year, ownerText) {
  const alive = [];
  const seen = new Set();
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 2) return;
    const id = String(person.id || person.wtid);
    if (seen.has(id)) return;
    seen.add(id);
    const born = yearOf(person.birth);
    const died = yearOf(person.death);
    if (!born || born > year || (died ? died < year : born + 90 < year)) return;
    alive.push(person);
  });
  const owner = ownerText === "Your" ? "your" : ownerText;
  if (!alive.length) return `None of ${owner} ancestors on the map have dates showing them alive in ${year}. Drag the map's year slider to move through time.`;
  const tally = (field) => {
    const counts = new Map();
    alive.forEach((person) => {
      const key = placeRegion(person[field])?.key;
      if (key) counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([key, count]) => `${key} (${count})`);
  };
  const born = tally("birthLocation");
  const died = tally("deathLocation");
  const lines = [`In ${year}, ${alive.length} of ${owner} ancestors were alive.`];
  if (born.length) lines.push(`They were born in ${born.slice(0, 6).join(", ")}.`);
  if (died.length) lines.push(`They would die in ${died.slice(0, 6).join(", ")}.`);
  lines.push(`The map shows the places and moves up to ${year}; drag its year slider to move through time.`);
  return lines.join("\n");
}

/** "Ellen's ancestors moved 23 times between 9 places. The biggest move: Ireland → New Zealand (4)." */
export function buildMigrationSummary(migration, ownerText) {
  if (!migration?.places?.length) return `${ownerText} ancestors have no birthplaces recorded to map.`;
  if (!migration.flows.length) {
    return `${ownerText} ancestors with birthplaces were all born in ${migration.places[0].key}${
      migration.places.length > 1 ? " or nearby" : ""
    }: no parent and child were born in different places.`;
  }
  const top = [...migration.flows].sort((a, b) => b.count - a.count)[0];
  const first = migration.flows[0];
  return `${ownerText} map shows ${migration.moves} move${migration.moves === 1 ? "" : "s"} between ${migration.places.length} places (a parent born in one place, their child in another). The biggest: ${top.from} → ${top.to} (${top.count}).${
    first.firstYear ? ` The earliest: ${first.from} → ${first.to}, by ${first.firstYear}.` : ""
  }`;
}

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z' -]*?-\d+['’]s)`;
const LEAD = String.raw`(?:(?:show|draw|make|create|give|display|open|build|generate)(?:\s+me)?\s+|(?:can|could|would)\s+you\s+(?:show|draw|make)(?:\s+me)?\s+)?`;
const MAP_PATTERNS = [
  // "show me my migration map", "Cook-8721's ancestor map", "a migration map"
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?(?:ancestors?['’]?\s+)?(?:migration|ancestors?|ancestral|family)\s+(?:migration\s+)?map$`, "i"),
  // "map my ancestors", "map of her ancestors", "show my ancestors on a map"
  new RegExp(String.raw`^${LEAD}(?:an?\s+)?map\s+(?:of\s+)?${OWNER}\s+ancestors(?:['’]\s+(?:migrations?|moves|birthplaces))?$`, "i"),
  new RegExp(String.raw`^(?:show|put|plot|draw)(?:\s+me)?\s+${OWNER}\s+ancestors\s+on\s+a\s+map$`, "i"),
  // "how did my ancestors migrate", "where did her ancestors migrate from"
  new RegExp(String.raw`^(?:how|where)\s+did\s+${OWNER}\s+ancestors\s+(?:migrate|move)(?:\s+(?:from|to))?$`, "i"),
];

// Descendants on the map: "map her descendants", "where did his descendants go".
const DESCENDANT_MAP_PATTERNS = [
  new RegExp(String.raw`^${LEAD}(?:an?\s+|the\s+)?(?:${OWNER}\s+)?descendants?['’]?\s+(?:migration\s+)?map$`, "i"),
  new RegExp(String.raw`^${LEAD}(?:an?\s+)?map\s+(?:of\s+)?${OWNER}\s+descendants$`, "i"),
  new RegExp(String.raw`^(?:show|put|plot|draw)(?:\s+me)?\s+${OWNER}\s+descendants\s+on\s+a\s+map$`, "i"),
  new RegExp(String.raw`^where\s+did\s+${OWNER}\s+descendants\s+(?:go|end\s+up|spread(?:\s+to)?|settle|move(?:\s+to)?|migrate(?:\s+to)?|live)$`, "i"),
  new RegExp(String.raw`^where\s+(?:are|were)\s+${OWNER}\s+descendants(?:\s+(?:now|living))?$`, "i"),
];

// "where were my ancestors living in 1850": the map at that year.
const YEAR_PATTERNS = [
  new RegExp(String.raw`^where\s+(?:were|did)\s+${OWNER}\s+ancestors(?:\s+(?:living|live))?\s+in\s+(\d{3,4})$`, "i"),
  new RegExp(String.raw`^${LEAD}(?:an?\s+)?map\s+(?:of\s+)?${OWNER}\s+ancestors\s+in\s+(\d{3,4})$`, "i"),
  new RegExp(String.raw`^(?:show|put|plot|draw)(?:\s+me)?\s+${OWNER}\s+ancestors\s+on\s+a\s+map\s+(?:in|for)\s+(\d{3,4})$`, "i"),
];

function canonicalOwner(word) {
  const raw = String(word || "")
    .trim()
    .replace(/['’]s$/i, "");
  if (!raw) return "";
  if (/^(?:my|our)$/i.test(raw)) return "my";
  if (/^(?:her|his|their)$/i.test(raw)) return raw.toLowerCase();
  if (/^this\s+(?:profile|person)$/i.test(raw)) return "";
  return raw;
}

/** {owner, ancestorPrompt} or null; owner as in parseFanChartPrompt. */
export function parseMigrationMapPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const re of DESCENDANT_MAP_PATTERNS) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const descendantPrompt = !owner ? "this profile's descendants" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} descendants` : `${owner}'s descendants`;
    return { owner, descendantPrompt, descendants: true };
  }
  for (const re of [...MAP_PATTERNS, ...YEAR_PATTERNS]) {
    const match = text.match(re);
    if (!match) continue;
    const owner = canonicalOwner(match[1]);
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    const year = Number(match[2]) || 0;
    return year ? { owner, ancestorPrompt, year } : { owner, ancestorPrompt };
  }
  return null;
}
