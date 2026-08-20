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

    const itemName = item.match(/\{\{([^|}]+)/);
    const extractedName = itemName?.[1]?.trim();
    const previousItem = index > 0 ? stuff[index - 1] : "";

    if (item.startsWith("[[Category:")) {
      tempStuffObject.categories.push(item);
    } else if (/^<!--.*-->$/.test(item) && previousItem.startsWith("[[Category:")) {
      tempStuffObject.categories.push(item);
    } else if (isGenealogicallyDefinedLink(item)) {
      tempStuffObject.genealogicallyDefined.push(item);
    } else if (item.toLowerCase().startsWith("{{easily confused")) {
      tempStuffObject.easilyConfused.push(item);
    } else if (
      templates.find(
        (template) => template.name === extractedName && template.group?.toLowerCase() === "research note box"
      )
    ) {
      tempStuffObject.researchNoteBoxes.push(item);
    } else if (
      templates.find((template) => template.name === extractedName && template.type?.toLowerCase() === "project box")
    ) {
      tempStuffObject.projectBoxes.push(item);
    } else if (
      templates.find((template) => template.name === extractedName && template.group?.toLowerCase() === "succession")
    ) {
      tempStuffObject.succession.push(item);
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

    const isCategoryLine = /^\[\[Category:[^\]]+\]\](\s*<!--.*-->)?$/i.test(trimmedLine);
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
