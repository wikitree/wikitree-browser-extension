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
