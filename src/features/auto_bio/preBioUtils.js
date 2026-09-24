export function isGenealogicallyDefinedLink(item = "") {
  return /^'''\s*\[\[Space:Genealogically Defined\|Genealogically Defined\]\]\s*'''$/i.test(item.trim());
}

export function findGenealogicallyDefinedLinePlacement(bioText = "") {
  if (!bioText) {
    return null;
  }

  const linePattern = /^[ \t]*('''\s*\[\[Space:Genealogically Defined\|Genealogically Defined\]\]\s*''')[ \t]*$/im;
  const lineMatch = linePattern.exec(bioText);
  if (!lineMatch) {
    return null;
  }

  const biographyHeadingMatch = /^==\s*Biography\s*==/im.exec(bioText);

  return {
    line: lineMatch[1].trim(),
    beforeBiography: !biographyHeadingMatch || lineMatch.index < biographyHeadingMatch.index,
  };
}

// People write "{{OnePlaceStudy}}", "{{One_Place_Study}}" or "{{one place study}}" for
// "{{One Place Study}}", so compare template names without spaces, underscores or case.
export function templateNameKey(name = "") {
  return name.replace(/[\s_]+/g, "").toLowerCase();
}

export function getTemplateName(templateText = "") {
  const nameMatch = templateText.match(/^\{\{\s*([^|}]+)/);
  return nameMatch ? nameMatch[1].trim() : "";
}

export function findTemplateDefinition(templateText = "", templates = []) {
  const key = templateNameKey(getTemplateName(templateText));
  return key ? templates.find((template) => templateNameKey(template.name || "") === key) : undefined;
}

// Swap the name in "{{OnePlaceStudy|place=...}}" for the documented one, leaving the parameters alone.
export function withCanonicalTemplateName(templateText = "", canonicalName = "") {
  if (!canonicalName) {
    return templateText;
  }
  return templateText.replace(/^\{\{\s*[^|}]+?(\s*)(?=\||\}\})/, `{{${canonicalName}$1`);
}

// Templates that belong after the Biography heading but aren't typed as a sticker or box
// in templatesExp.json, so the type-based match in getStickersAndBoxes misses them.
// (Notability is typed there as a "Formatting Template", and is missing entirely from
// copies of the file downloaded before mid-2026.)
export const templatesToKeepByName = ["Notability"];

export function findTemplatesToKeepByName(bioText = "", names = templatesToKeepByName) {
  if (!bioText) {
    return [];
  }

  const found = [];

  for (const match of bioText.matchAll(/\{\{[\s\S]*?\}\}/g)) {
    const key = templateNameKey(getTemplateName(match[0]));
    const canonicalName = names.find((name) => templateNameKey(name) === key);
    const template = withCanonicalTemplateName(match[0], canonicalName);

    if (canonicalName && !found.includes(template)) {
      found.push(template);
    }
  }

  return found;
}

export function splitStuffBeforeBioEntry(line = "", nextLine = "") {
  const pattern = /(\{\{.*?\}\}|\[\[.*?\]\])/g;
  const categoryOnlyPattern = /^\[\[Category:[^\]]+\]\]$/i;
  const htmlCommentPattern = /^<!--.*-->$/;

  if (!line || isGenealogicallyDefinedLink(line)) {
    return { items: [line], consumeNextLine: false };
  }

  const matches = Array.from(line.matchAll(pattern));
  if (matches.length === 0) {
    return { items: [line], consumeNextLine: false };
  }

  const splitItems = [];
  let consumeNextLine = false;

  for (let i = 0; i < matches.length; i++) {
    const token = matches[i][0];
    splitItems.push(token);

    const tokenEnd = matches[i].index + token.length;
    const nextTokenStart = i < matches.length - 1 ? matches[i + 1].index : line.length;
    const trailingText = line.slice(tokenEnd, nextTokenStart).trim();

    if (categoryOnlyPattern.test(token) && trailingText && htmlCommentPattern.test(trailingText)) {
      splitItems.push(trailingText);
    }
  }

  const lastToken = matches[matches.length - 1][0];
  if (categoryOnlyPattern.test(lastToken)) {
    const trimmedNextLine = nextLine?.trim();
    if (trimmedNextLine && htmlCommentPattern.test(trimmedNextLine)) {
      splitItems.push(trimmedNextLine);
      consumeNextLine = true;
    }
  }

  return { items: splitItems, consumeNextLine };
}

export function sortStuffBeforeBioItems(stuff = [], templatesObject = {}) {
  const templates = templatesObject?.templates || [];
  const tempStuffObject = {
    categories: [],
    genealogicallyDefined: [],
    easilyConfused: [],
    researchNoteBoxes: [],
    projectBoxes: [],
    succession: [],
  };

  stuff.forEach(function (item, index) {
    if (typeof item !== "string" || item === "") {
      return;
    }

    const template = item.startsWith("{{") ? findTemplateDefinition(item, templates) : undefined;
    const canonicalItem = withCanonicalTemplateName(item, template?.name);
    const previousItem = index > 0 ? stuff[index - 1] : "";

    if (item.startsWith("[[Category:")) {
      tempStuffObject.categories.push(item);
    } else if (/^<!--.*-->$/.test(item) && previousItem.startsWith("[[Category:")) {
      tempStuffObject.categories.push(item);
    } else if (isGenealogicallyDefinedLink(item)) {
      tempStuffObject.genealogicallyDefined.push(item);
    } else if (item.startsWith("{{") && templateNameKey(getTemplateName(item)) === "easilyconfused") {
      tempStuffObject.easilyConfused.push(withCanonicalTemplateName(item, "Easily Confused"));
    } else if (template?.group?.toLowerCase() === "research note box") {
      tempStuffObject.researchNoteBoxes.push(canonicalItem);
    } else if (template?.type?.toLowerCase() === "project box") {
      tempStuffObject.projectBoxes.push(canonicalItem);
    } else if (template?.group?.toLowerCase() === "succession") {
      tempStuffObject.succession.push(canonicalItem);
    }
  });

  return [
    ...tempStuffObject.categories,
    ...tempStuffObject.genealogicallyDefined,
    ...tempStuffObject.easilyConfused,
    ...tempStuffObject.researchNoteBoxes,
    ...tempStuffObject.projectBoxes,
    ...tempStuffObject.succession,
  ];
}

// Lines like ":'''Note 1:''' ..." or "'''Notes:''' ..." shouldn't be above the
// Biography heading at all; Auto Bio moves them to Research Notes.
const preBioNotePattern = /^[:*#]*\s*''+\s*Notes?\b[^']*''+/i;

export function isPreBioNoteLine(line = "") {
  return typeof line === "string" && preBioNotePattern.test(line.trim());
}

/* Split the lines before the Biography heading into the ones that are marked up
as notes (plus their indented continuation lines) and everything else. */
export function extractPreBioNotes(lines = []) {
  const notes = [];
  const remaining = [];
  let inNote = false;

  lines.forEach(function (line) {
    const trimmedLine = typeof line === "string" ? line.trim() : "";

    if (isPreBioNoteLine(trimmedLine)) {
      inNote = true;
      notes.push(trimmedLine);
    } else if (inNote && trimmedLine.startsWith(":")) {
      notes.push(trimmedLine);
    } else {
      inNote = false;
      remaining.push(line);
    }
  });

  return { notes, remaining };
}

/* The lines before the Biography heading that aren't templates or categories
(those are handled by StuffBeforeTheBio.text). */
export function getPreBioTextLines(bioText = "") {
  const allStuffBeforeTheBio = bioText?.match(/^(.*?)(==\s*Biography\s*==)/s);
  if (!allStuffBeforeTheBio) {
    return [];
  }

  const lines = allStuffBeforeTheBio[1].trim().split("\n");
  const filteredLines = [];
  let inTemplate = false;
  let previousLineWasCategory = false;

  for (let line of lines) {
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith("{{")) {
      inTemplate = true;
    }

    /* People put several categories on one line. Matching only a single one left the whole
    line looking like ordinary text, so it was kept verbatim as text before the bio *and*
    split into separate categories elsewhere — the categories came out twice. */
    const isCategoryLine = /^(\[\[Category:[^\]]+\]\]\s*)+(<!--.*-->)?$/i.test(trimmedLine);
    const isCommentLine = /^<!--.*-->$/.test(trimmedLine);
    const isCommentForPreviousCategory = previousLineWasCategory && isCommentLine;
    const isGenealogicallyDefinedLine = isGenealogicallyDefinedLink(trimmedLine);

    // Skip lines that are part of a template or are categories
    if (!inTemplate && !isCategoryLine && !isCommentForPreviousCategory && !isGenealogicallyDefinedLine) {
      filteredLines.push(line);
    }

    if (trimmedLine.endsWith("}}")) {
      inTemplate = false;
    }

    previousLineWasCategory = isCategoryLine;
  }

  return filteredLines;
}

/* Return the bio with the notes that were above the Biography heading taken out.
Auto Bio moves those to Research Notes, so the citations in them shouldn't be
harvested into the Sources section as well. */
export function removeNotesBeforeBio(bioText = "") {
  const allStuffBeforeTheBio = bioText?.match(/^(.*?)(==\s*Biography\s*==)/s);
  if (!allStuffBeforeTheBio) {
    return bioText;
  }

  const stuffBeforeTheBio = allStuffBeforeTheBio[1];
  const { notes, remaining } = extractPreBioNotes(stuffBeforeTheBio.split("\n"));
  if (notes.length === 0) {
    return bioText;
  }

  return remaining.join("\n") + bioText.slice(stuffBeforeTheBio.length);
}

function escapeRegExp(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// {{One Name Study|name=Greer}} is deprecated and Auto Bio drops it, but it was also what put the
// profile in the name study's category. Return a replacement "[[Category: Greer Name Study]]" for
// each one in the bio, unless the bio already has that category or a located one such as
// "[[Category: United States, Greer Name Study]]".
export function getOneNameStudyCategories(bioText = "") {
  if (!bioText) {
    return [];
  }

  const categories = [];
  const templatePattern = /\{\{\s*One[ _]*Name[ _]*Study\s*\|([^{}]*)\}\}/gi;
  for (const match of bioText.matchAll(templatePattern)) {
    const params = match[1].split("|").map((param) => param.trim());
    const nameParam = params.find((param) => /^name\s*=/i.test(param)) ?? params.find((param) => !param.includes("="));
    const surname = nameParam
      ?.replace(/^name\s*=/i, "")
      .replace(/_/g, " ")
      .trim();
    if (!surname) {
      continue;
    }

    const studyName = escapeRegExp(surname).replace(/ +/g, "[ _]+") + "[ _]+Name[ _]+Study";
    const existingCategoryPattern = new RegExp(
      `\\[\\[\\s*Category\\s*:\\s*(?:[^\\]|]*,\\s*)?${studyName}\\s*(?:\\|[^\\]]*)?\\]\\]`,
      "i"
    );
    const category = `[[Category: ${surname} Name Study]]`;
    if (!existingCategoryPattern.test(bioText) && !categories.includes(category)) {
      categories.push(category);
    }
  }

  return categories;
}
