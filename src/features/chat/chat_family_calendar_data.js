import { canonicalChartOwner as canonicalOwner } from "./chat_chart_prompt";
// Family calendar (2026-10-03, the "Wow!" visuals): "on this day in my family",
// "my ancestors' birthdays". Every ancestor's birth and death with a full date,
// placed on one year. The data is the fan chart's Ahnentafel slots; the d3
// drawing is chat_family_calendar.js.

import { generationOfSlot } from "./chat_fan_chart_data";
import { ancestorWord } from "./chat_kin_labels";

export const FAMILY_CALENDAR_GENERATIONS = 8;
export const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

const OWNER = String.raw`(my|our|her|his|their|this\s+(?:profile|person)['’]s|[A-Z][A-Za-z'_ -]*?-\d+['’]s)`;
const GROUP = String.raw`(?:family(?:\s+tree)?|tree|ancestors|ancestry|relatives)`;
const LEAD = String.raw`(?:(?:show|draw|make|open|display|give)(?:\s+me)?\s+)?`;
const MONTH = String.raw`(january|february|march|april|may|june|july|august|september|october|november|december)`;
const PATTERNS = [
  // "on this day in my family", "on this day", "today in her family history"
  // (a bare "today" isn't ours)
  { re: new RegExp(String.raw`^(?:what\s+happened\s+)?on\s+this\s+day(?:\s+in\s+(?:${OWNER}|this|the)\s+${GROUP}(?:\s+history)?)?$`, "i"), today: true },
  { re: new RegExp(String.raw`^(?:what\s+happened\s+)?today\s+in\s+${OWNER}\s+${GROUP}(?:\s+history)?$`, "i"), today: true },
  // "who in my family was born on this day", "which of my ancestors died today", "who of her ancestors were born on this date"
  {
    re: new RegExp(
      String.raw`^(?:who|which)\s+(?:in|of|among)\s+${OWNER}\s+${GROUP}\s+(?:(?:was|were)\s+)?(born|died|born\s+or\s+died)\s+(?:on\s+this\s+(?:day|date)|today)$`,
      "i"
    ),
    today: true,
  },
  // "my ancestors' birthdays", "family birthdays", "Cook-8721's family calendar", "birthday calendar"
  {
    re: new RegExp(
      String.raw`^${LEAD}(?:the\s+|an?\s+)?(?:${OWNER}\s+)?(?:(?:family|ancestors?['’]?|ancestral)\s+)?(?:birthdays(?:\s+calendar)?|birthday\s+calendar|calendar|anniversaries)$`,
      "i"
    ),
    today: false,
    needsQualifier: true,
  },
  // "who in my family was born in March", "which of my ancestors died in May"
  { re: new RegExp(String.raw`^(?:who|which)\s+(?:in|of|among)\s+${OWNER}\s+${GROUP}\s+(?:(?:was|were)\s+)?(born|died)\s+in\s+${MONTH}$`, "i"), month: true },
];


/** {owner, ancestorPrompt, today, month (1-12 or 0), event ("birth"|"death"|"")} or null. */
export function parseFamilyCalendarPrompt(prompt) {
  const text = String(prompt || "")
    .trim()
    .replace(/[.!?]+$/g, "")
    .replace(/\s+please$/i, "")
    .replace(/^please\s+/i, "");
  for (const pattern of PATTERNS) {
    const match = text.match(pattern.re);
    if (!match) continue;
    // A bare "calendar" or "anniversaries" needs "family"/"ancestors"/an owner: "calendar" alone isn't ours.
    if (pattern.needsQualifier && !/birthday/i.test(text) && !/\b(?:family|ancestors?|ancestral)\b/i.test(text)) return null;
    const owner = canonicalOwner(match[1]);
    const verb = String(match[2] || "").toLowerCase();
    const event = /^born$/.test(verb) ? "birth" : /^died$/.test(verb) ? "death" : "";
    const month = pattern.month ? MONTHS.findIndex((name) => name.toLowerCase() === String(match[3]).toLowerCase()) + 1 : 0;
    const ancestorPrompt = !owner ? "this profile's ancestors" : /^(?:my|her|his|their)$/.test(owner) ? `${owner} ancestors` : `${owner}'s ancestors`;
    return { owner, ancestorPrompt, today: Boolean(pattern.today), month, event };
  }
  return null;
}

/** {year, month, day} from "1850-03-12", or null when the month or day is unknown. */
export function dateParts(value) {
  const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  if (!year || !month || !day || month > 12 || day > MONTH_DAYS[month - 1]) return null;
  return { year, month, day };
}

/** Day of a leap year, 0-365, so 29 February has a place. */
export function dayOfYear(month, day) {
  let total = 0;
  for (let m = 1; m < month; m += 1) total += MONTH_DAYS[m - 1];
  return total + day - 1;
}

/**
 * Every dated birth and death: [{type, year, month, day, doy, slot, generation, relation,
 * wtid, name, gender, place}], in calendar order. Each person once (pedigree collapse).
 */
export function buildCalendarEvents(slots) {
  const events = [];
  const seen = new Set();
  (slots || []).forEach((person, slot) => {
    if (!person || slot < 1) return;
    const id = String(person.id || person.wtid);
    if (seen.has(id)) return;
    seen.add(id);
    const generation = person.generation ?? generationOfSlot(slot);
    const base = {
      slot,
      generation,
      relation: person.relation ?? (generation === 0 ? "" : ancestorWord(generation, person.gender)),
      wtid: person.wtid || "",
      name: person.name || person.wtid || "",
      gender: person.gender || "",
    };
    [
      ["birth", person.birth, person.birthLocation],
      ["death", person.death, person.deathLocation],
    ].forEach(([type, value, place]) => {
      const parts = dateParts(value);
      if (parts) events.push({ ...base, type, ...parts, doy: dayOfYear(parts.month, parts.day), place: place || "" });
    });
  });
  return events.sort((a, b) => a.doy - b.doy || a.year - b.year);
}

const dayText = (month, day) => `${day} ${MONTHS[month - 1]}`;
const lower = (text) => String(text || "").replace(/^\w/, (ch) => ch.toLowerCase());

function eventLine(event, ownerText) {
  const verb = event.type === "birth" ? "born" : "died";
  const who = event.generation === 0 ? event.name : `${event.name}, ${ownerText === "Your" ? "your" : `${ownerText}`} ${lower(event.relation)},`;
  return `${who} ${verb} in ${event.year}${event.place ? ` (${event.place})` : ""}`;
}

/** The next events after a day of the year (wrapping round to January). */
export function nextEvents(events, doy, count = 2) {
  const after = events.filter((event) => event.doy > doy);
  const ordered = after.concat(events.filter((event) => event.doy <= doy));
  if (!ordered.length) return [];
  const firstDay = ordered[0].doy;
  return ordered.filter((event) => event.doy === firstDay).slice(0, count);
}

/**
 * The chat reply. params: {today, month, event}. now: a Date (for "today").
 * ownerText: "Your" or "Cook-8721's".
 */
export function buildCalendarSummary(events, ownerText, params = {}, now = new Date()) {
  if (!events.length) return `${ownerText} ${params.scope === "family" ? "family members" : "ancestors"} don't have full birth or death dates on WikiTree yet, so the calendar is empty.`;
  const lines = [];
  const typed = params.event ? events.filter((event) => event.type === params.event) : events;
  if (params.month) {
    const inMonth = typed.filter((event) => event.month === params.month);
    const what = params.event === "death" ? "died" : params.event === "birth" ? "were born" : "were born or died";
    if (!inMonth.length) lines.push(`None of ${ownerText === "Your" ? "your" : ownerText} ${params.scope === "family" ? "family members" : "ancestors"} with full dates ${what} in ${MONTHS[params.month - 1]}.`);
    else {
      lines.push(`${inMonth.length} of ${ownerText === "Your" ? "your" : ownerText} ${params.scope === "family" ? "family members" : "ancestors"} ${what} in ${MONTHS[params.month - 1]}:`);
      inMonth.slice(0, 8).forEach((event) => lines.push(`• ${event.day} ${MONTHS[event.month - 1]}: ${eventLine(event, ownerText)}`));
      if (inMonth.length > 8) lines.push(`…and ${inMonth.length - 8} more on the calendar.`);
    }
  } else {
    const month = now.getMonth() + 1;
    const day = now.getDate();
    const today = typed.filter((event) => event.month === month && event.day === day);
    if (today.length) {
      lines.push(`On this day, ${dayText(month, day)}:`);
      today.forEach((event) => lines.push(`• ${eventLine(event, ownerText)}`));
    } else {
      lines.push(`Nothing in ${ownerText === "Your" ? "your" : ownerText} ${params.scope === "family" ? "family members" : "ancestors"}' dates falls on ${dayText(month, day)}.`);
      const next = nextEvents(typed, dayOfYear(month, day));
      if (next.length) lines.push(`Next up, ${dayText(next[0].month, next[0].day)}: ${next.map((event) => eventLine(event, ownerText)).join("; ")}.`);
    }
  }
  const births = events.filter((event) => event.type === "birth");
  const root = births.find((event) => event.generation === 0);
  if (root) {
    const twins = births.filter((event) => event !== root && event.month === root.month && event.day === root.day);
    if (twins.length) lines.push(`Birthday twin: ${twins.map((event) => `${event.name} (${lower(event.relation)}, ${event.year})`).join(", ")} shares ${root.name}'s birthday.`);
  }
  if (births.length >= 12) {
    const counts = MONTHS.map((name, index) => ({ name, count: births.filter((event) => event.month === index + 1).length }));
    const top = counts.slice().sort((a, b) => b.count - a.count)[0];
    lines.push(`The busiest month for births: ${top.name} (${top.count} of ${births.length}).`);
  }
  return lines.join("\n");
}
