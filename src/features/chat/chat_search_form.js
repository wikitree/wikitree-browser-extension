// A search form for people without an AI key (2026-10-04). With a key, the AI
// reads a request and fills a search spec; here the person fills the same spec
// in labelled boxes, and the same code (compileSearchSpec) turns it into a WT+
// query. Nothing is guessed from their wording except what can't be misread: a
// decade ("1850s", not "1800s", which could be a century) or a year range.

import $ from "jquery";
import { compileSearchSpec } from "./chat_search_spec";

export const SEARCH_FORM_FLAGS = [
  { flag: "Unsourced", label: "No sources" },
  { flag: "NoParents", label: "No parents" },
  { flag: "Unconnected", label: "Not connected" },
];

const TEXT_FIELDS = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "birthPlace", label: "Birth place" },
  { key: "deathPlace", label: "Death place" },
];
const YEAR_FIELDS = [
  { from: "bornFrom", to: "bornTo", label: "Born" },
  { from: "diedFrom", to: "diedTo", label: "Died" },
];

const PLACE_STOP = /^(?:between|before|after|from|and|or|who|with|without|that|in|on|at|but|not|no|only|unsourced|unconnected|died|born|married|aged?)$/i;

/** The place words right after "born in" / "died in": capitalised words, stopping at a lower-case word or a digit. */
function placeAfter(text, event) {
  const match = text.match(new RegExp(`\\b${event}\\s+in\\s+((?:the\\s+)?[A-Z][\\w'.-]*(?:[ ,]+[A-Z][\\w'.-]*)*)`));
  if (!match) return "";
  const words = match[1].split(/[ ,]+/).filter(Boolean);
  const kept = [];
  for (const word of words) {
    if (PLACE_STOP.test(word)) break;
    kept.push(word);
  }
  return kept.join(" ").replace(/^the\s+/i, "");
}

/** Years next to a life-event word: "died 1900-1950" or "died in the 1900s" → the died boxes; else birth. */
function yearSpan(text) {
  const decades = [...text.matchAll(/\b(1[0-9]|20)([0-9])0'?s\b/g)].filter((match) => match[2] !== "0");
  const ranges = [...text.matchAll(/\b(1[0-9]{3}|20[0-9]{2})\s*(?:[-–]|to)\s*(1[0-9]{3}|20[0-9]{2})\b/g)];
  let from;
  let to;
  let at;
  if (decades.length === 1 && !ranges.length) {
    from = Number(`${decades[0][1]}${decades[0][2]}0`);
    to = from + 9;
    at = decades[0].index;
  } else if (ranges.length === 1 && !decades.length && Number(ranges[0][1]) <= Number(ranges[0][2])) {
    from = Number(ranges[0][1]);
    to = Number(ranges[0][2]);
    at = ranges[0].index;
  } else {
    return null;
  }
  // (the nearest life-event word before the years says whose years they are)
  const events = [...text.slice(0, at).matchAll(/\b(born|birth|died|death|dying)\b/gi)];
  const died = events.length > 0 && /^(?:died|death|dying)$/i.test(events[events.length - 1][1]);
  return { from: String(from), to: String(to), event: died ? "died" : "born" };
}

/**
 * Only what can't be misread: one decade like 1850s or one year range like 1850-1859 (as birth years, or
 * death years after "died"), "last name X", "first name X", "born in Place", "died in Place", men/women,
 * and the no-sources / no-parents / not-connected words. A bare name or place stays theirs to type.
 */
export function prefillSearchForm(prompt) {
  const text = String(prompt || "");
  const values = {};
  const span = yearSpan(text);
  if (span) {
    values[span.event === "died" ? "diedFrom" : "bornFrom"] = span.from;
    values[span.event === "died" ? "diedTo" : "bornTo"] = span.to;
  }
  const lastName = text.match(/\b(?:[Ll]ast\s*[Nn]ame|[Ss]urname|[Nn]amed|[Cc]alled|[Ss]urnamed)\s+"?([A-Z][A-Za-z'-]+)"?/);
  if (lastName && !PLACE_STOP.test(lastName[1])) values.lastName = lastName[1];
  const firstName = text.match(/\b(?:first\s*name|forename|given\s+name)\s+"?([A-Z][A-Za-z'-]+)"?/i);
  if (firstName && !PLACE_STOP.test(firstName[1])) values.firstName = firstName[1];
  const birthPlace = placeAfter(text, "born");
  if (birthPlace) values.birthPlace = birthPlace;
  const deathPlace = placeAfter(text, "died");
  if (deathPlace) values.deathPlace = deathPlace;
  if (/\b(?:women|woman|females?|girls?)\b/i.test(text) && !/\b(?:men|man|males?|boys?)\b/i.test(text)) values.gender = "female";
  else if (/\b(?:men|man|males?|boys?)\b/i.test(text) && !/\b(?:women|woman|females?|girls?)\b/i.test(text)) values.gender = "male";
  const flags = [];
  if (/\b(?:unsourced|no\s+sources?|without\s+sources?|missing\s+sources?)\b/i.test(text)) flags.push("Unsourced");
  if (/\b(?:no\s+parents|without\s+parents|orphans?)\b/i.test(text)) flags.push("NoParents");
  if (/\b(?:unconnected|not\s+connected)\b/i.test(text)) flags.push("Unconnected");
  if (flags.length) values.flags = flags;
  return values;
}

const clean = (value) => String(value ?? "").trim();
const year = (value) => (/^\d{3,4}$/.test(clean(value)) ? Number(clean(value)) : null);

/** The form's values → a search spec, as the AI would write it. */
export function searchFormSpec(values = {}) {
  const spec = {};
  const names = {};
  if (clean(values.firstName)) names.firstName = clean(values.firstName);
  if (clean(values.lastName)) names.anyLastName = clean(values.lastName);
  if (Object.keys(names).length) spec.names = names;
  const places = [];
  if (clean(values.birthPlace)) places.push({ text: clean(values.birthPlace), event: "birth" });
  if (clean(values.deathPlace)) places.push({ text: clean(values.deathPlace), event: "death" });
  if (places.length) spec.places = places;
  const dates = [];
  [
    ["birth", values.bornFrom, values.bornTo],
    ["death", values.diedFrom, values.diedTo],
  ].forEach(([event, from, to]) => {
    const start = year(from);
    const end = year(to);
    if (start === null && end === null) return;
    const date = { event };
    if (start !== null) date.from = start;
    if (end !== null) date.to = end;
    dates.push(date);
  });
  if (dates.length) spec.dates = dates;
  if (values.gender === "male" || values.gender === "female") spec.gender = values.gender;
  const flags = SEARCH_FORM_FLAGS.map((entry) => entry.flag).filter((flag) => (values.flags || []).includes(flag));
  if (flags.length) spec.flags = flags;
  return spec;
}

/** "Smith, born in Yorkshire 1850–1859, no sources". */
export function describeSearchForm(values = {}) {
  const parts = [];
  const name = [clean(values.firstName), clean(values.lastName)].filter(Boolean).join(" ");
  if (name) parts.push(name);
  const span = (from, to) => {
    const start = year(from);
    const end = year(to);
    if (start !== null && end !== null) return start === end ? `${start}` : `${start}–${end}`;
    if (start !== null) return `${start} or later`;
    if (end !== null) return `${end} or earlier`;
    return "";
  };
  const born = [clean(values.birthPlace) && `in ${clean(values.birthPlace)}`, span(values.bornFrom, values.bornTo)].filter(Boolean).join(" ");
  if (born) parts.push(`born ${born}`);
  const died = [clean(values.deathPlace) && `in ${clean(values.deathPlace)}`, span(values.diedFrom, values.diedTo)].filter(Boolean).join(" ");
  if (died) parts.push(`died ${died}`);
  if (values.gender === "male" || values.gender === "female") parts.push(values.gender === "male" ? "men" : "women");
  SEARCH_FORM_FLAGS.forEach((entry) => {
    if ((values.flags || []).includes(entry.flag)) parts.push(entry.label.toLowerCase());
  });
  return parts.join(", ");
}

/** → {query, description} or {problem} when there's nothing to search for or a year is wrong. */
export function searchFormQuery(values = {}) {
  for (const field of YEAR_FIELDS) {
    for (const key of [field.from, field.to]) {
      if (clean(values[key]) && year(values[key]) === null) return { problem: `${field.label}: "${clean(values[key])}" isn't a year.` };
    }
    const start = year(values[field.from]);
    const end = year(values[field.to]);
    if (start !== null && end !== null && start > end) return { problem: `${field.label}: the first year is after the second.` };
  }
  const spec = searchFormSpec(values);
  if (!Object.keys(spec).length) return { problem: "Fill in at least one box." };
  if (!spec.names && !spec.places && !spec.dates) return { problem: "Add a name, a place or some years as well." };
  const compiled = compileSearchSpec(spec);
  if (compiled.errors.length || !compiled.query) return { problem: "That search couldn't be built. Check the boxes." };
  return { query: compiled.query, description: describeSearchForm(values) };
}

/** The form, filled with `values`; onSubmit(values) runs the search. */
export function renderSearchForm(values = {}, onSubmit) {
  const $form = $("<form>").addClass("wbe-chat-search-form").attr("autocomplete", "off");
  const $grid = $("<div>").addClass("wbe-chat-search-form-grid");
  TEXT_FIELDS.forEach((field) => {
    $grid.append(
      $("<label>")
        .text(field.label)
        .append($("<input>").attr({ type: "text", name: field.key }).val(clean(values[field.key])))
    );
  });
  YEAR_FIELDS.forEach((field) => {
    $grid.append(
      $("<label>")
        .text(`${field.label} (years)`)
        .append(
          $("<span>")
            .addClass("wbe-chat-search-form-years")
            .append(
              $("<input>").attr({ type: "text", name: field.from, inputmode: "numeric", placeholder: "from", maxlength: 4 }).val(clean(values[field.from])),
              $("<span>").text("–"),
              $("<input>").attr({ type: "text", name: field.to, inputmode: "numeric", placeholder: "to", maxlength: 4 }).val(clean(values[field.to]))
            )
        )
    );
  });
  const $gender = $("<select>").attr("name", "gender");
  [
    ["", "Anyone"],
    ["male", "Men"],
    ["female", "Women"],
  ].forEach(([value, label]) => $gender.append($("<option>").val(value).text(label)));
  $gender.val(values.gender === "male" || values.gender === "female" ? values.gender : "");
  $grid.append($("<label>").text("Who").append($gender));
  const $flags = $("<div>").addClass("wbe-chat-search-form-flags");
  SEARCH_FORM_FLAGS.forEach((entry) => {
    $flags.append(
      $("<label>").append(
        $("<input>").attr({ type: "checkbox", name: "flags", value: entry.flag }).prop("checked", (values.flags || []).includes(entry.flag)),
        document.createTextNode(` ${entry.label}`)
      )
    );
  });
  const $problem = $("<div>").addClass("wbe-chat-search-form-problem").attr("role", "alert");
  const $submit = $("<button>").attr("type", "submit").addClass("chat-message-action wbe-chat-search-form-submit").text("Search");
  $form.append($grid, $flags, $("<div>").addClass("wbe-chat-search-form-foot").append($submit, $problem));

  const read = () => {
    const next = {};
    TEXT_FIELDS.forEach((field) => (next[field.key] = clean($form.find(`[name="${field.key}"]`).val())));
    YEAR_FIELDS.forEach((field) => {
      next[field.from] = clean($form.find(`[name="${field.from}"]`).val());
      next[field.to] = clean($form.find(`[name="${field.to}"]`).val());
    });
    next.gender = $gender.val() || "";
    next.flags = $form
      .find('[name="flags"]:checked')
      .map((index, input) => input.value)
      .get();
    return next;
  };
  $form.on("submit", (event) => {
    event.preventDefault();
    const next = read();
    const built = searchFormQuery(next);
    if (built.problem) {
      $problem.text(built.problem);
      return;
    }
    $problem.text("");
    onSubmit?.(next, built);
  });
  // (keys typed here are the form's, not the chat box's or the page's shortcuts)
  $form.on("keydown", (event) => event.stopPropagation());
  return $form;
}
