/**
 * Keeping the citations an old bio had inline where they were.
 *
 * Auto Bio writes a new narrative and attaches each citation to an event by guessing the event from the
 * citation's own wording. A citation it cannot place that way (an Arolsen record, a camp register) ends up
 * under "See also". Here the old bio is read for the sentence each <ref> followed, and that sentence says
 * which event the citation is for, whatever its wording.
 */
import { citationDedupeKey, decodeHtmlEntities } from "./citationTextUtils.js";

const MARKER = "\u0001";

/* Sentence endings that are not ones: "St. Louis", "Mr. Smith", "J. Smith". */
const ABBREVIATIONS = new Set([
  "st",
  "mt",
  "ft",
  "mr",
  "mrs",
  "ms",
  "dr",
  "jr",
  "sr",
  "co",
  "no",
  "rev",
  "capt",
  "col",
  "gen",
  "lt",
  "sgt",
  "wm",
  "jas",
  "geo",
  "chas",
  "thos",
  "vs",
  "etc",
  "inc",
  "ca",
]);

/* The event a sentence is about, by the first of these words in it. Auto Bio writes the first five itself. */
const EVENT_WORDS = [
  ["Birth", /\b(?:was born|born|birth)\b/i],
  ["Baptism", /\b(?:baptized|baptised|baptism|christened|christening)\b/i],
  [
    "Death",
    /\b(?:died|dies|death|murdered|killed|executed|hanged|drowned|perished|passed away|was shot|deceased|lynched|assassinated)\b/i,
  ],
  ["Burial", /\b(?:buried|burial|interred|cremated|funeral)\b/i],
  ["Marriage", /\b(?:married|marriage|wed|wedding|divorced)\b/i],
  [
    "Imprisonment",
    /\b(?:imprisoned|prison|prisoner|arrested|incarcerated|concentration camp|deported|sentenced|jailed)\b/i,
  ],
  ["Military", /\b(?:served|enlisted|drafted|regiment|army|navy|soldier)\b/i],
  ["Census", /\b(?:census|was living|were living|lived)\b/i],
];

/* What is said of a death when it was not a plain "died". */
const DEATH_VERBS =
  /\bwas (?:murdered|killed|executed|hanged|shot|lynched|assassinated|drowned)\b|\b(?:drowned|perished)\b/i;

/** Types Auto Bio writes a sentence for. A citation of one of these is simply given that type. */
const EVENTS_AUTO_BIO_WRITES = {
  Birth: ["Birth"],
  Baptism: ["Baptism"],
  Death: ["Death"],
  Burial: ["Burial", "Death"],
  Marriage: ["Marriage"],
};

/** A citation as it is compared: the same whether it was read from the bio's text or through the HTML parser. */
export function anchorKey(text = "") {
  return citationDedupeKey(decodeHtmlEntities(String(text).replace(/<br\s*\/?>/gi, "<br>")));
}

/* Where each sentence in the text ends, as the index just after its closing punctuation. */
function sentenceEnds(text) {
  const ends = [];
  const pattern = /[.!?]+["'”’)\]]*(?=\s|$)/g;
  let match;
  while ((match = pattern.exec(text))) {
    const word = (text.slice(0, match.index).match(/(\S+)$/) || ["", ""])[1].toLowerCase().replace(/[^a-z]/g, "");
    const isAbbreviation = match[0][0] === "." && (ABBREVIATIONS.has(word) || /^[a-z]$/.test(word));
    if (!isAbbreviation) {
      ends.push(match.index + match[0].length);
    }
  }
  return ends;
}

/**
 * The sentence a ref belongs to: the one it follows, or the one it is in the middle of.
 *
 * @param {string} marked the bio with every ref replaced by a marker
 * @param {number} position where the ref is
 * @returns {{sentence: string, id: string}|null}
 */
function sentenceOfRef(marked, position) {
  const before = marked.slice(0, position).split(MARKER).join("");
  const lineStart = before.lastIndexOf("\n") + 1;
  const paragraph = before.slice(lineStart);
  if (!paragraph.trim()) {
    return null;
  }
  const ends = sentenceEnds(paragraph);
  const lastEnd = ends.length ? ends[ends.length - 1] : -1;
  let startInParagraph;
  let sentence;
  if (lastEnd >= paragraph.trimEnd().length) {
    // the ref follows the full stop
    startInParagraph = ends.length > 1 ? ends[ends.length - 2] : 0;
    sentence = paragraph.slice(startInParagraph, lastEnd);
  } else {
    // the ref is in the middle of the sentence, so the rest of it is after the ref
    startInParagraph = ends.length ? lastEnd : 0;
    const afterLine = marked
      .slice(position + 1)
      .split("\n")[0]
      .split(MARKER)
      .join("");
    const afterEnds = sentenceEnds(afterLine);
    sentence =
      paragraph.slice(startInParagraph) + afterLine.slice(0, afterEnds.length ? afterEnds[0] : afterLine.length);
  }
  const trimmed = sentence.trim();
  if (trimmed.length < 8) {
    return null;
  }
  const leading = sentence.length - sentence.trimStart().length;
  return { sentence: trimmed, id: String(lineStart + startInParagraph + leading) };
}

/** The event a sentence is about, or null. */
export function eventOfSentence(sentence = "") {
  let found = null;
  let foundAt = Infinity;
  EVENT_WORDS.forEach(([event, pattern]) => {
    const match = sentence.match(pattern);
    if (match && match.index < foundAt) {
      found = event;
      foundAt = match.index;
    }
  });
  return found;
}

/** Everything in a bio that is not the Sources or Research Notes. */
function bodyOfBio(bio = "") {
  const withoutNotes = bio.replace(/==\s*Research Notes\s*==.*?(?=\n\s*==[^=]|$)/gis, "");
  const sources = withoutNotes.search(/==\s*Sources\s*==/i);
  return sources === -1 ? withoutNotes : withoutNotes.slice(0, sources);
}

/**
 * Every ref in the body of a bio, with the sentence it supports and what that sentence is about. A ref that
 * only points back at a named one (<ref name="x" />) is included, with no text of its own.
 *
 * @param {string} bio
 * @returns {{key: string, refName: string, sentence: string, sentenceId: string, event: string|null}[]}
 */
export function findInlineCitationAnchors(bio = "") {
  const body = bodyOfBio(bio);
  const refs = [];
  const marked = body.replace(/<ref\b([^>]*?)(?:\/>|>([\s\S]*?)<\/ref>)/gi, (match, attributes, inner) => {
    const name = (attributes || "").match(/\bname\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'/>]+))/i);
    refs.push({ refName: name ? name[1] ?? name[2] ?? name[3] : "", text: inner || "" });
    return MARKER;
  });

  const anchors = [];
  let index = 0;
  for (let position = marked.indexOf(MARKER); position !== -1; position = marked.indexOf(MARKER, position + 1)) {
    const ref = refs[index++];
    const found = sentenceOfRef(marked, position);
    if (found) {
      anchors.push({
        key: ref.text.trim() ? anchorKey(ref.text) : "",
        refName: ref.refName,
        sentence: found.sentence,
        sentenceId: found.id,
        event: eventOfSentence(found.sentence),
      });
    }
  }
  return anchors;
}

const isFindAGrave = (reference) => /findagrave|Find a Grave/i.test(reference?.Text || "");

/* The earliest year in the text that falls inside the person's life (and is not their birth year). */
function yearInLife(text, { birthYear, deathYear }) {
  const cleaned = String(text || "").replace(/accessed[^)]*\)/gi, "");
  const years = (cleaned.match(/\b(1[0-9]{3}|20[0-9]{2})\b/g) || []).map(Number).filter((year) => {
    return (!birthYear || year > birthYear) && (!deathYear || year <= deathYear);
  });
  return years.length ? Math.min(...years) : null;
}

/**
 * Use the anchors on the references Auto Bio has read from the bio:
 *  - a citation whose wording gave it no type is given the type of the sentence it followed (a citation
 *    that followed the birth sentence is a Birth citation), so it is used inline and not left under "See also";
 *  - when another source was cited inline for the death, Find a Grave is no longer taken as the death source
 *    (a memorial is a headstone at a cemetery, so it is a source for the burial);
 *  - a sentence about something Auto Bio cannot write (imprisonment, say) is kept, with its citations, to be
 *    put in the narrative as it was;
 *  - the way a death was put ("was murdered") is kept.
 *
 * @param {object[]} references the references, as sourcesArray builds them (changed in place)
 * @param {object[]} anchors from findInlineCitationAnchors
 * @param {{birthYear?: number, deathYear?: number}} [life]
 * @returns {{sentences: {id: string, sentence: string, event: string|null, year: number|null}[], deathVerb: string}}
 */
export function applyInlineCitationAnchors(references, anchors, life = {}) {
  const byKey = new Map();
  const byName = new Map();
  references.forEach((reference) => {
    const key = anchorKey(reference.Text);
    if (!byKey.has(key)) {
      byKey.set(key, reference);
    }
    if (reference.RefName && !byName.has(reference.RefName)) {
      byName.set(reference.RefName, reference);
    }
  });

  const untyped = new Set(references.filter((reference) => !reference["Record Type"]?.length));
  const bySentence = new Map();
  const anchoredEvents = new Map(); // reference -> events of the sentences it followed
  anchors.forEach((anchor) => {
    const reference = (anchor.key && byKey.get(anchor.key)) || (anchor.refName && byName.get(anchor.refName));
    if (!reference) {
      return;
    }
    if (!anchoredEvents.has(reference)) {
      anchoredEvents.set(reference, new Set());
    }
    anchoredEvents.get(reference).add(anchor.event);
    if (!bySentence.has(anchor.sentenceId)) {
      bySentence.set(anchor.sentenceId, {
        id: anchor.sentenceId,
        sentence: anchor.sentence,
        event: anchor.event,
        refs: new Set(),
      });
    }
    bySentence.get(anchor.sentenceId).refs.add(reference);
  });

  // 1. A citation with no type is given the type of what it was cited for.
  const citedForDeath = new Set();
  anchoredEvents.forEach((events, reference) => {
    events.forEach((event) => {
      const types = EVENTS_AUTO_BIO_WRITES[event];
      if (!types) {
        return;
      }
      if (untyped.has(reference)) {
        reference["Record Type"] = reference["Record Type"] || [];
        types.forEach((type) => {
          if (!reference["Record Type"].includes(type)) {
            reference["Record Type"].push(type);
          }
        });
        /* A birth or baptism citation is only used when its year is near the birth year, and a citation with no
        date in its wording has no year. The old bio put it after the birth, so take its word for it. */
        if (["Birth", "Baptism"].includes(event) && !reference.Year && life.birthYear) {
          reference.Year = String(life.birthYear);
        }
      }
      if (types.includes("Death") && !isFindAGrave(reference)) {
        citedForDeath.add(reference);
      }
    });
  });

  // 2. Another source was cited for the death, so Find a Grave is not taken as the source of it.
  if (citedForDeath.size) {
    references.forEach((reference) => {
      const events = anchoredEvents.get(reference);
      const citedHereForDeath = events && (events.has("Death") || events.has("Burial"));
      if (isFindAGrave(reference) && !citedHereForDeath && reference["Record Type"]?.includes("Death")) {
        // A memorial is a headstone at a cemetery: it is a source for the burial, not for the death.
        reference["Record Type"] = reference["Record Type"].filter((type) => type !== "Death");
        if (!reference["Record Type"].includes("Burial")) {
          reference["Record Type"].push("Burial");
        }
      }
    });
  }

  // 3. A sentence Auto Bio cannot write is kept, if some citation of it would otherwise be left out of it.
  const sentences = [];
  let deathVerb = "";
  bySentence.forEach((entry) => {
    if (entry.event === "Death" && !deathVerb) {
      const verb = entry.sentence.match(DEATH_VERBS);
      if (verb) {
        deathVerb = verb[0].toLowerCase();
      }
    }
    if (EVENTS_AUTO_BIO_WRITES[entry.event]) {
      return;
    }
    const orphans = [...entry.refs].filter((reference) => untyped.has(reference));
    if (!orphans.length) {
      return;
    }
    const year =
      yearInLife(entry.sentence, life) || yearInLife(orphans.map((reference) => reference.Text).join(" "), life);
    orphans.forEach((reference) => {
      reference.AnchorId = entry.id;
    });
    sentences.push({ id: entry.id, sentence: entry.sentence, event: entry.event, year });
  });

  return { sentences, deathVerb };
}
