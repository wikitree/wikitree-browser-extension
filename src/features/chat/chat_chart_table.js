// Tables for the charts (2026-10-04, the user: "I like tables. When we have a
// visualisation that is showing instead of a table, I want a Table button").
// Each chart already holds its people as summaries ({wtid, name, lnab, gender,
// birth, death, birthLocation, …}); these turn them into a results table, so
// the Table button needs no second fetch and follow-ups ("only the women")
// work on the chart's people.

import { escapeHtml } from "../../core/lib/diff_utils";
import { generationOfSlot } from "./chat_fan_chart_data";
import { descendantWord } from "./chat_lifespans_data";
import { makeProfileLink, withDerivedRowFields } from "./tables";

/** "Father", "Grandmother", "Great-grandfather", "3x great-grandmother". */
export function ancestorWord(generation, gender) {
  const base = gender === "Female" ? "mother" : gender === "Male" ? "father" : "parent";
  if (generation <= 0) return "";
  if (generation === 1) return base[0].toUpperCase() + base.slice(1);
  if (generation === 2) return `Grand${base}`;
  if (generation === 3) return `Great-grand${base}`;
  return `${generation - 2}x great-grand${base}`;
}

function firstNameOf(person) {
  const name = String(person?.name || "").trim();
  const lnab = String(person?.lnab || "").trim();
  return lnab && name.endsWith(` ${lnab}`) ? name.slice(0, -lnab.length - 1) : name;
}

/** A results-table row for a chart's person summary. */
export function chartPersonRow(person, extra = {}) {
  return withDerivedRowFields({
    wtid: person?.wtid || "",
    displayName: person?.name || "",
    firstName: firstNameOf(person),
    lnab: person?.lnab || "",
    gender: person?.gender || "",
    birth: person?.birth || "",
    death: person?.death || "",
    birthLocation: person?.birthLocation || "",
    deathLocation: person?.deathLocation || "",
    ...extra,
  });
}

/** The table: Relation (and Ahnen) when known, then the person's facts. */
export function makeChartTable(title, rows) {
  const has = (key) => rows.some((row) => row?.[key] !== undefined && row?.[key] !== null && String(row[key]).trim() !== "");
  const columns = [
    has("ahnen") ? { title: "Ahnen", key: "ahnen" } : null,
    has("relation") ? { title: "Relation", key: "relation", cellClass: "nowrap-cell" } : null,
    { title: "WT ID", key: "wtid", render: (row) => (row.wtid ? makeProfileLink(row.wtid, row.wtid) : escapeHtml(row.hidden ? "(private)" : "")) },
    { title: "First Name", key: "firstName" },
    { title: "Last Name", key: "lnab", cellClass: "nowrap-cell", headerTitle: "Last name at birth" },
    { title: "Birth", key: "birth", cellClass: "chat-date-cell" },
    { title: "Death", key: "death", cellClass: "chat-date-cell" },
    { title: "Birth Location", key: "birthLocation" },
    has("deathLocation") ? { title: "Death Location", key: "deathLocation" } : null,
  ].filter(Boolean);
  return { title, defaultOrder: [[0, "asc"]], columns, rows };
}

/** Fan chart, migration map, tree overview: Ahnentafel slots (slot 1 is the root). */
export function tableFromSlots(title, slots) {
  const rows = [];
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 1) return;
    const generation = generationOfSlot(slot);
    rows.push(chartPersonRow(person, { ahnen: slot, relation: generation ? ancestorWord(generation, person.gender) : "Self", hidden: Boolean(person.hidden) }));
  });
  return makeChartTable(title, rows);
}

/** Descendant chart, descendant map, fractal tree: {person, children: [...]}. */
export function tableFromTree(title, tree, which = "descendants") {
  const rows = [];
  const walk = (node, generation) => {
    if (!node?.person) return;
    const person = node.person;
    const relation = generation ? (which === "ancestors" ? ancestorWord(generation, person.gender) : descendantWord(generation, person.gender)) : "Self";
    rows.push(chartPersonRow(person, { relation, generation, hidden: Boolean(person.hidden) }));
    (node.children || []).forEach((child) => walk(child, generation + 1));
  };
  walk(tree, 0);
  return makeChartTable(title, rows);
}

/** Lifespans (any view): its rows, with the relation or group the chart shows. */
export function tableFromLifespanRows(title, rows) {
  return makeChartTable(
    title,
    (rows || []).map((row) =>
      chartPersonRow(row, {
        relation: row.relation || row.group || "",
        birth: row.birth || (row.start ? String(row.start) : ""),
        death: row.death || (row.endKnown && row.end ? String(row.end) : ""),
        hidden: Boolean(row.hidden),
      })
    )
  );
}

/** Family Explorer: everyone loaded around the focus person. */
export function tableFromPeople(title, people) {
  return makeChartTable(
    title,
    [...(people || [])].filter(Boolean).map((person) => chartPersonRow(person, { hidden: Boolean(person.hidden) }))
  );
}
