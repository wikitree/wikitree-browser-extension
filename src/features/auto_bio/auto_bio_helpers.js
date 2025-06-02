// src/features/auto_bio/auto_bio_helpers.js
import $ from "jquery";

/** Regex you already use elsewhere – pull it up once. */
export const REGEX_UNSOURCED = /unsourced template|citation needed/i;

/**
 * Extract <ref> elements, de-duplicate same-@name refs,
 * return plain objects suitable for refArr.
 */
export function collectReferences(html, unsourced = REGEX_UNSOURCED) {
  const $dom = $("<html>").append(html);
  const refs = $dom.find("ref").toArray();
  const nameCounter = new Map(); // @name → next suffix letter
  const seenNames = new Set();

  return refs.flatMap((el) => {
    const $el = $(el);
    let name = $el.attr("name") || "";

    if (name && seenNames.has(name)) return []; // duplicate @name, skip

    if (name) {
      // keep duplicates unique
      const suffix = nameCounter.get(name) || "a";
      nameCounter.set(name, String.fromCharCode(suffix.charCodeAt(0) + 1));
      name = `${name}_${suffix}`;
      seenNames.add(name);
    }

    const raw = // prefer innerText in FF, else HTML stripped
      (window.isFirefox ? el.innerText : $el.html() || "").trim().replace(/&amp;/g, "&");

    if (!raw) return [];

    return [
      {
        Text: raw.match(/^(.*?)(?=<\/?ref|$)/s)?.[1]?.trim() || raw,
        RefName: name,
        NonSource: unsourced.test(raw),
      },
    ];
  });
}

/**
 * Turn the Sources heading text (array of lines in window.sourcesSection.text)
 * into extra {Text, RefName:"", NonSource, Narrative?} objects pushed onto refArr.
 *
 * Returns nothing – it mutates refArr in-place.
 */
export function processSourcesSection(lines, refArr, unsourcedRX) {
  // ① strip “Replace this citation …” & prepend asterisks where missing
  const cleanedLines = lines.map((l) => {
    if (!l) return "";
    if (l.match(/database( with images)?, FamilySearch|^http/) && !l.startsWith("*"))
      return "* " + l.replace(/''Replace this citation if there is another source.''/, "");
    if (!l.match(/<references\s?\/>/)) return l.replace(/''Replace this citation if there is another source.''/, "");
    return "";
  });

  // ② rejoin into a single string → split on bare “*” (your existing trick)
  let section = cleanedLines.join("\n");
  let bits = section.split(/^\*/gm);

  for (let i = bits.length - 1; i >= 0; i--) {
    if (bits[i].startsWith("*") && i > 0) {
      bits[i - 1] += "*" + bits[i]; // glue ** child back to parent line
      bits[i] = "";
    }
  }
  if (!section.includes("*")) bits = section.split(/\n/);

  // ③ iterate each bit exactly like your original loop
  const blank = /^[\n\s]*$/;
  bits.forEach((src) => {
    if (blank.test(src)) return;
    const nonSource = unsourcedRX.test(src);
    // test for the blank line + “!{|” sequence
    if (src.match(/\n\n(!\{\|)/)) {
      // split on the same sequence, keeping the delimiter with a capture group
      src.split(/\n\n(!\{\|)/).forEach((sub) => {
        if (!blank.test(sub)) refArr.push({ Text: sub.trim(), RefName: "", NonSource: nonSource });
      });
      return;
    }

    const newRef = { Text: src.trim(), RefName: "", NonSource: nonSource };

    // look for inline <ref> .. </ref> and attach Narrative when matches existing refArr
    const tags = src.match(/<ref[^>]*>.*?<\/ref>/gs);
    if (tags) {
      let addIt = true;
      tags.forEach((tag) => {
        const inner = tag
          .match(/<ref[^>]*>(.*?)<\/ref>/s)[1]
          .trim()
          .replace(/<br\/>/g, "<br>");
        const match = refArr.find((r) => r.Text === inner);
        if (match) {
          match.Narrative = src.split(tag)[0];
          addIt = false;
        }
      });
      if (!addIt) return;
    }
    refArr.push(newRef);
  });
}

