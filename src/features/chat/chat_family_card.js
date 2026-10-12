// The Family Explorer's person card, the part shared by the 3D view and the Galaxy (user, 2026-10-12: "Can you
// add much more information in these cards?", "Richer card for Galaxy, please"): born and died, parents, each
// marriage with its children, other children, and brothers and sisters (see chat_family_card_data.js), and
// fetching someone's family when their card opens and it isn't all loaded. Each view styles the classes
// `${prefix}-facts`, `${prefix}-kids`, `${prefix}-who` and `${prefix}-loading` itself.

import { cardFacts } from "./chat_family_card_data";
import { escapeText, fullName, lifeYears, profileUrl } from "./chat_chart_common";

/** "A, B and C", the first `most` of them, then how many more. */
export function cardList(items, most = 12) {
  const shown = items.slice(0, most);
  const more = items.length - shown.length;
  const words = more ? [...shown, `${more} more`] : shown;
  return words.length > 1 ? `${words.slice(0, -1).join(", ")} and ${words[words.length - 1]}` : words[0] || "";
}

/**
 * The card's facts about `id` as HTML ("" when there are none). Someone in the view (pickOf(person) gives a
 * value) is a button with that value in data-pick, to pick them out; anyone else links to their profile.
 * `loading` adds "Finding their family…".
 */
export function familyFactsHtml(people, id, { prefix, pickOf = () => "", pickTitle = "Show them", loading = false }) {
  const facts = cardFacts(people, id);
  if (!facts) return "";
  const link = (wtid, text) => `<a class="${prefix}-who" href="${escapeText(profileUrl(wtid))}" target="_blank" rel="noopener" title="Open the WikiTree profile">${escapeText(text)}</a>`;
  const who = (person) => {
    const years = lifeYears(person);
    const after = years ? ` <small>(${escapeText(years)})</small>` : "";
    const pick = pickOf(person);
    if (pick) return `<button type="button" class="${prefix}-who" data-pick="${escapeText(pick)}" title="${escapeText(pickTitle)}">${escapeText(fullName(person))}</button>${after}`;
    return `${person.wtid ? link(person.wtid, fullName(person)) : escapeText(fullName(person))}${after}`;
  };
  const age = facts.age ? `, aged ${facts.age.about ? "about " : ""}${facts.age.years}` : "";
  const event = (label, { date, place }, extra = "") => (date || place ? `<div><b>${label}</b>${escapeText(date)}${place ? `${date ? " in " : ""}${escapeText(place)}` : ""}${extra}</div>` : "");
  const privateNote = (count, others) => (count ? ` <small>(${others ? "and " : ""}${count} private)</small>` : "");
  const rows = [event("Born", facts.born), event("Died", facts.died, age)];
  if (facts.parents.length) rows.push(`<div><b>Parents</b>${cardList(facts.parents.map(who))}</div>`);
  facts.marriages.forEach((marriage) => {
    const spouse = marriage.spouse ? who(marriage.spouse) : marriage.wtid ? link(marriage.wtid, marriage.wtid) : "";
    const when = [marriage.married && ` in ${escapeText(marriage.married)}`, marriage.place && ` in ${escapeText(marriage.place)}`].filter(Boolean).join("");
    rows.push(`<div><b>Married</b>${spouse}${when}</div>`);
    if (marriage.children.length || marriage.hidden) {
      const label = marriage.children.length === 1 ? "Child" : marriage.children.length ? `Children (${marriage.children.length})` : "Children";
      rows.push(`<div class="${prefix}-kids"><b>${label}</b>${cardList(marriage.children.map(who))}${privateNote(marriage.hidden, marriage.children.length)}</div>`);
    }
  });
  if (facts.children.length || facts.hidden.children) {
    const label = facts.marriages.length ? "Other children" : "Children";
    rows.push(`<div><b>${label}${facts.children.length > 1 ? ` (${facts.children.length})` : ""}</b>${cardList(facts.children.map(who))}${privateNote(facts.hidden.children, facts.children.length)}</div>`);
  }
  if (facts.siblings.length || facts.hidden.siblings) {
    const names = facts.siblings.map((entry) => `${who(entry.person)}${entry.half ? " <small>half</small>" : ""}`);
    rows.push(`<div><b>Brothers and sisters${facts.siblings.length > 1 ? ` (${facts.siblings.length})` : ""}</b>${cardList(names)}${privateNote(facts.hidden.siblings, names.length)}</div>`);
  }
  if (loading) rows.push(`<div class="${prefix}-loading">Finding their family…</div>`);
  const html = rows.filter(Boolean).join("");
  return html ? `<div class="${prefix}-facts">${html}</div>` : "";
}

/**
 * Fetches someone's parents, husbands and wives, brothers and sisters and children for their card, once each:
 * load(id) (getPeople nuclear=1), then onDone(id). Returns {ensure(person), loading(id)}.
 */
export function familyFetcher(world, load, onDone) {
  const asked = new Set();
  const busy = new Set();
  // (a nuclear fetch round someone marks them both ways: see mergeWorldPeople)
  const known = (id) => world.childrenKnown?.has(id) && world.parentsKnown?.has(id);
  return {
    ensure(person) {
      const id = person?.id;
      if (!load || !id || id < 0 || person.hidden || asked.has(id) || known(id)) return;
      asked.add(id);
      busy.add(id);
      onDone(id);
      Promise.resolve()
        .then(() => load(id))
        .catch(() => asked.delete(id))
        .finally(() => {
          busy.delete(id);
          onDone(id);
        });
    },
    loading: (id) => busy.has(id),
  };
}
