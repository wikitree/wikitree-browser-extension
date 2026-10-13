// The Family Explorer's "Family" view (user, 2026-10-11: "Let's do all three"): one person in the
// middle as a big photo card, their husband or wife beside them, their parents above (with their
// parents small above those), their brothers and sisters in the same row, their children below
// (with the grandchildren listed under each child). Clicking anyone moves everything round them.
// This file works out who goes where; chat_family_navigator.js draws it and moves it.

import { yearOf } from "./chat_text_utils";

/**
 * Card sizes at scale 1 (photo beside the words, so five generations fit on a screen at a size
 * that reads): the person (xl), husbands, wives and parents (l), brothers, sisters and children
 * (m), grandparents (s), and a grandchild's one-line chip.
 */
export const NAV_SIZES = {
  xl: { w: 340, h: 150, font: 16, photo: 116 },
  l: { w: 232, h: 92, font: 14, photo: 66 },
  m: { w: 200, h: 78, font: 13, photo: 52 },
  s: { w: 178, h: 62, font: 12, photo: 40 },
  chip: { w: 152, h: 38, font: 12, photo: 28 },
};

const GAP = 20; // between cards in a row
const COUPLE_GAP = 72; // between a person and their husband or wife (room for the ring and year)
const CHIPS_SHOWN = 4; // grandchildren listed under a child (then "+N more")
// Rows by the middle of their cards; the person's card is at y = 0.
const ROW = { grand: -302, parents: -179, children: 176 };
const SIBLINGS_IN_ONE_ROW = 4; // (more go in two rows)
const WRAP_ROWS = [-44, 44]; // the two rows' middles (clear of the parents' and children's rows)
const WRAP_COL_GAP = 30; // between columns then (room for the line down to the second row)
const PARENT_SPREAD = 214; // each parent from the middle (room for both pairs of grandparents)

const byBirth = (a, b) => (a.birth || "9999").localeCompare(b.birth || "9999") || a.id - b.id;

function roleWord(kind, person) {
  const gender = String(person?.gender || "").toLowerCase();
  const male = gender === "male";
  const female = gender === "female";
  const words = {
    parent: ["Father", "Mother", "Parent"],
    grandparent: ["Grandfather", "Grandmother", "Grandparent"],
    sibling: ["Brother", "Sister", "Sibling"],
    half: ["Half-brother", "Half-sister", "Half-sibling"],
    spouse: ["Husband", "Wife", "Spouse"],
    child: ["Son", "Daughter", "Child"],
    grandchild: ["Grandson", "Granddaughter", "Grandchild"],
  }[kind];
  return male ? words[0] : female ? words[1] : words[2];
}

/** Someone known only as a spouse's ID (not loaded yet): enough for a card. */
function stubPerson(id, wtid) {
  return { id, wtid: wtid || "", name: wtid || "", lnab: "", stub: true };
}

/**
 * Who is around `id` in the world's people (Id → summary; see summarizeWorldPerson): their parents
 * and grandparents, brothers and sisters (and half ones), husbands or wives with the children of
 * each, and those children's children.
 */
export function familyAround(people, id) {
  const centre = people.get(id);
  if (!centre) return null;
  const all = [...people.values()];
  const childrenOf = (personId) => (personId ? all.filter((p) => p.fatherId === personId || p.motherId === personId).sort(byBirth) : []);
  const get = (personId) => (personId ? people.get(personId) || null : null);
  const father = get(centre.fatherId);
  const mother = get(centre.motherId);
  const parentsOf = (person) => (person ? [get(person.fatherId), get(person.motherId)] : [null, null]);

  const siblings = all
    .filter(
      (p) =>
        p.id !== centre.id &&
        ((centre.fatherId && p.fatherId === centre.fatherId) || (centre.motherId && p.motherId === centre.motherId))
    )
    .map((p) => ({ person: p, half: !(p.fatherId === centre.fatherId && p.motherId === centre.motherId) }))
    .sort((a, b) => byBirth(a.person, b.person));
  const centreYear = centre.birth || "";
  const older = centreYear ? siblings.filter((s) => (s.person.birth || "9999") < centreYear) : siblings.slice(0, Math.ceil(siblings.length / 2));
  const younger = siblings.filter((s) => !older.includes(s));

  // Husbands and wives: the ones recorded, then anyone else they had children with.
  const kids = childrenOf(centre.id);
  const otherOf = (child) => (child.fatherId === centre.id ? child.motherId : child.fatherId) || 0;
  const spouseIds = [];
  const married = new Map();
  (centre.spouses || []).forEach((spouse) => {
    if (!spouseIds.includes(spouse.id)) spouseIds.push(spouse.id);
    married.set(spouse.id, { married: spouse.married || "", wtid: spouse.wtid || "" });
  });
  kids.forEach((child) => {
    const other = otherOf(child);
    if (other && !spouseIds.includes(other)) spouseIds.push(other);
  });
  const spouses = spouseIds
    .map((spouseId) => ({
      person: get(spouseId) || stubPerson(spouseId, married.get(spouseId)?.wtid),
      married: married.get(spouseId)?.married || "",
      children: kids.filter((child) => otherOf(child) === spouseId),
    }))
    .sort((a, b) => (a.married || a.children[0]?.birth || "9999").localeCompare(b.married || b.children[0]?.birth || "9999"));
  const unpartnered = kids.filter((child) => !otherOf(child));

  return {
    centre,
    father,
    mother,
    grandparents: { father: parentsOf(father), mother: parentsOf(mother) },
    older,
    younger,
    spouses,
    unpartnered,
    grandchildren: new Map(kids.map((child) => [child.id, childrenOf(child.id)])),
  };
}

/**
 * Whether everyone the view shows around `id` is loaded: their parents and children, their parents'
 * parents and their children's children (world: childrenKnown, parentsKnown, tried; see createFamilyWorld).
 */
export function familyLoaded(world, id) {
  if (world.tried?.has(id)) return true;
  const person = world.people.get(id);
  if (!person) return false;
  if (!world.parentsKnown.has(id) || !world.childrenKnown.has(id)) return false;
  const parents = [person.fatherId, person.motherId].filter((parentId) => parentId > 0);
  if (parents.some((parentId) => world.people.has(parentId) && !world.parentsKnown.has(parentId))) return false;
  const kids = [...world.people.values()].filter((p) => p.fatherId === id || p.motherId === id);
  if (kids.some((child) => child.id > 0 && !world.childrenKnown.has(child.id))) return false;
  return (person.spouses || []).every((spouse) => spouse.id < 0 || world.people.has(spouse.id));
}

/**
 * Where everyone goes, the person at (0, 0): {cards: [{key, person, role, size, x, y, w, h, anchor,
 * centre?, placeholder?, more?}], links: [{key, kind: "curve"|"line", x1, y1, x2, y2, faint?}],
 * rings: [{key, x, y, year}]}. x and y are a card's middle. anchor: the key of the card a new card
 * grows out of.
 */
export function navigatorLayout(family) {
  const cards = [];
  const links = [];
  const rings = [];
  if (!family) return { cards, links, rings };
  const { centre } = family;
  const keyOf = (person) => `p${person.id}`;
  const centreKey = keyOf(centre);
  const add = (person, role, size, x, y, anchor, extra = {}) => {
    const box = NAV_SIZES[size];
    const card = { key: person ? keyOf(person) : extra.key, person, role, size, x, y, w: box.w, h: box.h, anchor, ...extra };
    // (someone twice, say a cousin marriage: the second card gets its own key)
    if (cards.some((other) => other.key === card.key)) card.key = `${card.key}-${role}`;
    cards.push(card);
    return card;
  };
  const top = (card) => card.y - card.h / 2;
  const bottom = (card) => card.y + card.h / 2;
  const curve = (key, x1, y1, x2, y2, faint = false) => links.push({ key, kind: "curve", x1, y1, x2, y2, faint });
  const line = (key, x1, y1, x2, y2) => links.push({ key, kind: "line", x1, y1, x2, y2 });
  const couple = (key, left, right, year) => {
    const y = (left.y + right.y) / 2;
    line(`${key}-bar`, left.x + left.w / 2, y, right.x - right.w / 2, y);
    const ring = { key, x: (left.x + left.w / 2 + right.x - right.w / 2) / 2, y, year };
    rings.push(ring);
    return ring;
  };

  // The middle row: older brothers and sisters, the person and their husband or wife (a second one on
  // the left, a third on the right again …), then the younger ones.
  const xl = NAV_SIZES.xl;
  const middle = add(centre, "", "xl", 0, 0, null, { centre: true });
  let leftEdge = -xl.w / 2;
  let rightEdge = xl.w / 2;
  const spouseCards = family.spouses.map((spouse, i) => {
    const box = NAV_SIZES.l;
    const space = i < 2 ? COUPLE_GAP : GAP * 2;
    const onLeft = i % 2 === 1;
    const x = onLeft ? leftEdge - space - box.w / 2 : rightEdge + space + box.w / 2;
    if (onLeft) leftEdge = x - box.w / 2;
    else rightEdge = x + box.w / 2;
    return add(spouse.person, roleWord("spouse", spouse.person), "l", x, 0, centreKey, { married: spouse.married, onLeft });
  });
  const m = NAV_SIZES.m;
  const siblingCards = [];
  const siblingRole = (sibling) => roleWord(sibling.half ? "half" : "sibling", sibling.person);
  const older = family.older;
  const younger = family.younger;
  // Many brothers and sisters (seen live: 9 in one row shrank everything to 60%) go in two rows
  // beside the person, read down each column then across, oldest at the far left.
  const wrap = older.length + younger.length > SIBLINGS_IN_ONE_ROW;
  const colGap = wrap ? WRAP_COL_GAP : GAP;
  const rows = wrap ? WRAP_ROWS : [0];
  // (the farthest column first on the left, the nearest first on the right)
  const placeSide = (list, startEdge, direction) => {
    const columns = Math.ceil(list.length / rows.length);
    list.forEach((sibling, i) => {
      const column = Math.floor(i / rows.length);
      const fromPerson = direction < 0 ? columns - 1 - column : column;
      const x = startEdge + direction * (colGap + m.w / 2 + fromPerson * (m.w + colGap));
      siblingCards.push(add(sibling.person, siblingRole(sibling), "m", x, rows[i % rows.length], centreKey, { half: sibling.half, row: i % rows.length }));
    });
  };
  placeSide(older, leftEdge - (leftEdge < -xl.w / 2 ? GAP : 0), -1);
  placeSide(younger, rightEdge + (rightEdge > xl.w / 2 ? GAP : 0), 1);

  // Parents above, the couple's middle over the person; each one's parents small above them.
  const parentY = ROW.parents;
  const both = family.father && family.mother;
  // (a parent not recorded isn't drawn: the line comes from the one who is)
  // ("Biological father" when the person is shown with their birth parents: chat_family_world_data.js)
  const parentRole = (person) => {
    const word = roleWord("parent", person);
    return person.id && (person.id === centre.bioFatherId || person.id === centre.bioMotherId) ? `Biological ${word.toLowerCase()}` : word;
  };
  const parentSlot = (person, side) => (person ? add(person, parentRole(person), "l", both ? side * PARENT_SPREAD : 0, parentY, centreKey) : null);
  const fatherCard = parentSlot(family.father, -1);
  const motherCard = parentSlot(family.mother, 1);
  const parentsRing = fatherCard && motherCard ? couple("parents", fatherCard, motherCard, "") : null;
  const descentFrom = (card) => ({ x: card.x, y: bottom(card) });
  const siblingsSource = (child) => {
    if (parentsRing && !child.half) return parentsRing;
    const parent = child.person.fatherId && fatherCard && child.person.fatherId === fatherCard.person.id ? fatherCard : motherCard || fatherCard;
    return parent ? descentFrom(parent) : null;
  };
  // The person and their full brothers and sisters hang from one bar under the parents (seen live:
  // a curve to each from the parents bunched up and ran under the mother's card), the person straight
  // below. A half one's line comes from their own parent.
  const mainSource = parentsRing || (fatherCard || motherCard ? descentFrom(fatherCard || motherCard) : null);
  const rowTop = Math.min(top(middle), ...siblingCards.filter((card) => !card.row).map(top));
  const busY = (parentY + NAV_SIZES.l.h / 2 + rowTop) / 2;
  const busXs = [];
  [middle, ...siblingCards].forEach((card) => {
    const from = siblingsSource(card);
    if (!from) return;
    // (one in the second row: down the gap beside its column, then in to its left side)
    const gapX = card.row ? card.x - card.w / 2 - colGap / 2 : card.x;
    const into = () => card.row && line(`in-${card.key}`, gapX, card.y, card.x - card.w / 2, card.y);
    // (with one parent recorded everyone hangs from them)
    const onMain = parentsRing ? from === parentsRing : true;
    if (card === middle && onMain) {
      line(`d-${card.key}`, mainSource.x, mainSource.y, card.x, top(card));
    } else if (onMain) {
      busXs.push(gapX);
      line(`d-${card.key}`, gapX, busY, gapX, card.row ? card.y : top(card));
      into();
    } else if (card.row) {
      const upperTop = rows[0] - m.h / 2;
      curve(`d-${card.key}`, from.x, from.y, gapX, upperTop);
      line(`spine-${card.key}`, gapX, upperTop, gapX, card.y);
      into();
    } else {
      curve(`d-${card.key}`, from.x, from.y, card.x, top(card));
    }
  });
  if (busXs.length && mainSource) {
    const xs = [mainSource.x, ...busXs];
    line("bus-siblings", Math.min(...xs), busY, Math.max(...xs), busY);
  }

  const s = NAV_SIZES.s;
  [
    [fatherCard, family.grandparents.father],
    [motherCard, family.grandparents.mother],
  ].forEach(([parentCard, pair]) => {
    if (!parentCard) return;
    const [gf, gm] = pair;
    const gap = 30; // (room for their marriage ring between them)
    const placed = [gf, gm].filter(Boolean);
    const x0 = parentCard.x - ((placed.length - 1) * (s.w + gap)) / 2;
    const gpCards = placed.map((gp, i) => add(gp, roleWord("grandparent", gp), "s", x0 + i * (s.w + gap), ROW.grand, parentCard.key));
    const from = gpCards.length === 2 ? couple(`gp-${parentCard.key}`, gpCards[0], gpCards[1], "") : gpCards[0] ? descentFrom(gpCards[0]) : null;
    if (from) curve(`d-${parentCard.key}`, from.x, from.y, parentCard.x, top(parentCard));
  });

  // Children below, each family's under its couple; grandchildren listed under each child.
  const groups = [
    ...(family.unpartnered.length ? [{ children: family.unpartnered, source: { x: 0, y: bottom(middle) }, ideal: 0 }] : []),
    ...family.spouses.map((spouse, i) => {
      const card = spouseCards[i];
      const ring = card.onLeft ? couple(`m-${card.key}`, card, middle, yearOf(spouse.married) || "") : couple(`m-${card.key}`, middle, card, yearOf(spouse.married) || "");
      return { children: spouse.children, source: ring, ideal: ring.x };
    }),
  ]
    .filter((group) => group.children.length)
    .sort((a, b) => a.ideal - b.ideal);
  let floor = -Infinity;
  const childY = ROW.children;
  groups.forEach((group) => {
    const width = group.children.length * m.w + (group.children.length - 1) * GAP;
    const x0 = Math.max(group.ideal - width / 2, floor + GAP * 2);
    floor = x0 + width;
    group.children.forEach((child, i) => {
      const card = add(child, roleWord("child", child), "m", x0 + m.w / 2 + i * (m.w + GAP), childY, centreKey);
      curve(`d-${card.key}`, group.source.x, group.source.y, card.x, top(card));
      const grandkids = family.grandchildren.get(child.id) || [];
      const chip = NAV_SIZES.chip;
      const shown = grandkids.length > CHIPS_SHOWN ? grandkids.slice(0, CHIPS_SHOWN - 1) : grandkids;
      const spineX = card.x - card.w / 2 + 14;
      let y = bottom(card) + 12 + chip.h / 2;
      const chips = shown.map((grandkid) => {
        const placed = add(grandkid, roleWord("grandchild", grandkid), "chip", card.x + 6, y, card.key);
        y += chip.h + 8;
        return placed;
      });
      if (grandkids.length > shown.length) {
        chips.push(add(null, "", "chip", card.x + 6, y, card.key, { key: `more-${child.id}`, more: grandkids.length - shown.length, moreOf: child }));
      }
      if (chips.length) {
        line(`spine-${card.key}`, spineX, bottom(card), spineX, chips[chips.length - 1].y);
        chips.forEach((placed) => line(`tick-${placed.key}`, spineX, placed.y, placed.x - placed.w / 2, placed.y));
      }
    });
  });
  return { cards, links, rings };
}

/** The box round everything laid out: {x0, y0, x1, y1}. */
export function layoutBounds(layout) {
  const box = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
  layout.cards.forEach((card) => {
    box.x0 = Math.min(box.x0, card.x - card.w / 2);
    box.x1 = Math.max(box.x1, card.x + card.w / 2);
    box.y0 = Math.min(box.y0, card.y - card.h / 2);
    box.y1 = Math.max(box.y1, card.y + card.h / 2);
  });
  return box;
}

/** What `to` is to `from` ("father", "sister", "wife", "grandson" …; grandparents need `peopleById`), or "" when further apart. */
export function stepWord(from, to, peopleById = null) {
  if (!from || !to) return "";
  const gender = String(to.gender || "").toLowerCase();
  const pick = (male, female, either) => (gender === "male" ? male : gender === "female" ? female : either);
  if (to.id === from.fatherId || to.id === from.motherId) return pick("father", "mother", "parent");
  if (from.id === to.fatherId || from.id === to.motherId) return pick("son", "daughter", "child");
  if ((from.spouses || []).some((spouse) => spouse.id === to.id) || (to.spouses || []).some((spouse) => spouse.id === from.id)) {
    return pick("husband", "wife", "spouse");
  }
  const parentsOf = (person) => [person.fatherId, person.motherId].filter(Boolean);
  const grandparent = (younger, older) => parentsOf(younger).some((parentId) => peopleById?.get(parentId) && parentsOf(peopleById.get(parentId)).includes(older.id));
  if (grandparent(from, to)) return pick("grandfather", "grandmother", "grandparent");
  if (grandparent(to, from)) return pick("grandson", "granddaughter", "grandchild");
  const shared = [from.fatherId, from.motherId].filter((parentId) => parentId && (parentId === to.fatherId || parentId === to.motherId));
  if (!shared.length) return "";
  // (half: one parent shared, the other recorded for both and different)
  const half = shared.length === 1 && from.fatherId && from.motherId && to.fatherId && to.motherId;
  return half ? pick("half-brother", "half-sister", "half-sibling") : pick("brother", "sister", "sibling");
}
