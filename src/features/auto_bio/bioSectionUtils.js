/**
 * Splitting an existing biography into its sections and subsections so the generated
 * text can preserve what was already there.
 */
import $ from "jquery";
import { splitStuffBeforeBioEntry } from "./preBioUtils.js";

export function normalizeTemplatesInSectionArray(textArray) {
  const normalized = [];
  let currentTemplate = "";

  for (let item of textArray) {
    // Check if this item is already a complete template (single-line)
    if (item.startsWith("{{") && item.includes("}}")) {
      // Complete template, add it directly
      if (currentTemplate) {
        // Finish any pending template first
        normalized.push(currentTemplate);
        currentTemplate = "";
      }
      normalized.push(item);
    } else if (item.startsWith("{{")) {
      // Start of a multi-line template
      if (currentTemplate) {
        normalized.push(currentTemplate);
      }
      currentTemplate = item;
    } else if (currentTemplate && item.endsWith("}}")) {
      // End of multi-line template
      currentTemplate += " " + item;
      normalized.push(currentTemplate);
      currentTemplate = "";
    } else if (currentTemplate) {
      // Middle of multi-line template
      currentTemplate += " " + item;
    } else {
      // Standalone item (category, text, etc.)
      normalized.push(item);
    }
  }

  // If there's an unclosed template, add it anyway
  if (currentTemplate) {
    normalized.push(currentTemplate);
  }

  return normalized;
}

export function splitBioIntoSections() {
  const wikiText = $("#wpTextbox1").val();
  let lines = [];
  if (wikiText) {
    lines = wikiText.split("\n");
  }
  let currentSection = { subsections: {}, text: [] };
  let currentSubsection = null;
  let sections = {
    StuffBeforeTheBio: {
      title: "StuffBeforeTheBio",
      text: [],
      subsections: {},
    },
    Biography: {
      title: "Biography",
      text: [],
      subsections: {},
    },
    "Research Notes": {
      title: "ResearchNotes",
      text: [],
      subsections: { NeedsProfiles: [] },
    },
    Sources: {
      title: "Sources",
      text: [],
      subsections: {},
    },
    Acknowledgements: {
      title: "Acknowledgements",
      text: [],
      subsections: {},
    },
  };
  const exclude = [/<!-- Please edit, add, or delete anything in this text.*->/];
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    exclude.forEach(function (ex) {
      const m = line.match(ex);
      if (m) console.log(`exclude match: ${m}`);
      line = line.replace(ex, "").trim();
    });

    // If the line is empty and the previous section is "Sources", keep the line as-is without trimming
    if (currentSection.title === "Sources" && line === "") {
      line = lines[i];
    }

    let sectionMatch = line.match(/^={2}([^=]+)={2}$/);
    let subsectionMatch = line.match(/^={3}([^=]+)={3}$/);
    if (sectionMatch) {
      let newSectionTitle = sectionMatch[1].trim();
      let originalTitle = newSectionTitle;
      if (newSectionTitle == "Acknowledgments") {
        newSectionTitle = "Acknowledgements";
      }
      if (newSectionTitle.match(/Research Notes/i)) {
        newSectionTitle = "Research Notes";
      }
      if (newSectionTitle.match(/Census/i)) {
        newSectionTitle = "Census";
      }
      /* "See also", "See Also" and "SEE ALSO" are all in use. The section is looked up by
      key later, so settle on one spelling here. */
      if (newSectionTitle.match(/^see\s*also$/i)) {
        newSectionTitle = "See Also";
      }

      sections[newSectionTitle] = {
        title: newSectionTitle,
        text: [],
        subsections: {},
        originalTitle: originalTitle,
      };
      currentSection = sections[newSectionTitle];
      if (currentSection.title == "Research Notes") {
        currentSection.subsections["NeedsProfiles"] = [];
      }
      currentSubsection = null;
    } else if (subsectionMatch) {
      let newSubsectionTitle = subsectionMatch[1].trim();

      let originalTitle = newSubsectionTitle;
      if (newSubsectionTitle == "Acknowledgments") {
        newSubsectionTitle = "Acknowledgements";
      }

      currentSection.subsections[newSubsectionTitle] = {
        title: newSubsectionTitle,
        text: [],
        subsections: {},
        originalTitle: originalTitle,
      };

      currentSubsection = currentSection.subsections[newSubsectionTitle];
    } else {
      let skip = false;
      if (line.match(/^See also:/i) || line.match("''Add \\[\\[sources\\]\\] here.''")) {
        skip = true;
      }
      if (currentSubsection && line && !skip) {
        currentSubsection.text.push(line);
      } else if (currentSection && !skip) {
        currentSection.text.push(line);
        if (!currentSection.title) {
          sections.StuffBeforeTheBio.text.push(line);
        }
      }
    }
  }

  // Normalize all multi-line templates to single-line in all sections
  for (let sectionName in sections) {
    if (sections[sectionName].text && Array.isArray(sections[sectionName].text)) {
      sections[sectionName].text = normalizeTemplatesInSectionArray(sections[sectionName].text);
    }
    if (sections[sectionName].subsections) {
      for (let subsectionName in sections[sectionName].subsections) {
        if (sections[sectionName].subsections[subsectionName].text) {
          sections[sectionName].subsections[subsectionName].text = normalizeTemplatesInSectionArray(
            sections[sectionName].subsections[subsectionName].text
          );
        }
      }
    }
  }

  if (sections.Sources) {
    let shouldStartWithAsterisk = true;
    sections.Sources.text.forEach(function (line, i) {
      const matchOldBEETableHeading = line.match(/.*:$/);
      const matchPreviousBlankLine = !sections.Sources.text[i - 1];
      const matchTable = line.match(/^\{\|/);
      const isBEECitation = (matchOldBEETableHeading || matchTable) && matchPreviousBlankLine;
      if (shouldStartWithAsterisk && line.trim() !== "" && !line.trim().startsWith("*") && !isBEECitation) {
        sections.Sources.text[i] = "*" + line.trim();
      }
      shouldStartWithAsterisk = line.trim() === "";
      if (line.match(/^See also:/i) == null && line.match("''Add \\[\\[sources\\]\\] here.''") == null) {
        if (line.match(/This person was created on.* /)) {
          sections.Acknowledgements.text.push(line);
          sections.Sources.text.splice(i, 1);
        }
        if (line.match(/Sources? will be added/gs) || line.match("''Add [[sources]] here.''")) {
          sections.Sources.text.splice(i, 1);
        }
      }
    });
    if (sections.Sources.subsections?.Acknowledgements) {
      sections.Acknowledgements.text = sections.Sources.subsections.Acknowledgements.text;
    }
    if (
      ["Birth", "Baptism", "Marriage", "Burial", "Death"].forEach(function (fact) {
        if (sections.Sources.subsections[fact]) {
          sections.Sources.subsections[fact].text.forEach(function (line) {
            sections.Sources.text.push(line);
          });
        }
      })
    );
    /* Loop through the Research Notes section.
    If the line matches "The following people may need profiles:"
    then add the next lines to NeedsProfiles (while the line has a name)
    and remove it from ["Research Notes"].text */
    if (sections["Research Notes"] || sections?.Biography?.subsections?.["Research Notes"]) {
      if (sections?.Biography?.subsections?.["Research Notes"]) {
        sections.Biography.subsections["Research Notes"].text.forEach(function (line) {
          sections["Research Notes"].text.push(line);
        });
      }
      const namePattern = new RegExp(
        /^\*\s([A-Za-z]+(?:[.'-][A-Za-z]+)*(?:\s[A-Za-z]+(?:[.'-][A-Za-z]+)*)+)(?:\s\(([A-Za-z\s]+)\))?$/
      );

      for (let i = 0; i < sections["Research Notes"].text.length; i++) {
        if (sections["Research Notes"].text[i].match(/The following people may need profiles:/)) {
          sections["Research Notes"].text.splice(i, 1); // Remove the matched line
          i--; // Decrement i to account for the removed line

          let j = i + 1;
          while (sections["Research Notes"].text[j] && sections["Research Notes"].text[j].match(namePattern)) {
            const nameMatch = sections["Research Notes"].text[j].match(namePattern);
            sections["Research Notes"].subsections["NeedsProfiles"].push({
              Name: nameMatch[1],
              Relation: nameMatch[2],
            });
            sections["Research Notes"].text.splice(j, 1);
          }
        }
      }
    }
  }

  // Split the things before the bio up into separate items
  if (sections.StuffBeforeTheBio.text?.length > 0) {
    for (let i = 0; i < sections.StuffBeforeTheBio.text.length; i++) {
      const line = sections.StuffBeforeTheBio.text[i];
      const nextLine = sections.StuffBeforeTheBio.text[i + 1];
      const { items: splitItems, consumeNextLine } = splitStuffBeforeBioEntry(line, nextLine);

      sections.StuffBeforeTheBio.text[i] = splitItems[0];
      if (splitItems.length > 1) {
        sections.StuffBeforeTheBio.text.splice(i + 1, 0, ...splitItems.slice(1));
      }
      if (consumeNextLine) {
        sections.StuffBeforeTheBio.text.splice(i + splitItems.length, 1);
      }
      const gedcomMatch = sections.StuffBeforeTheBio.text[i].match(/\.ged\s/);
      if (gedcomMatch) {
        const thisThing = sections.StuffBeforeTheBio.text[i]
          .replace(/The following data[^.]+\./, "")
          .replace(/You may wish[^.]+\./, "");
        sections.Acknowledgements.text.push(thisThing);
        sections.StuffBeforeTheBio.text.splice(i, 1);
      }
    }
  }

  if (sections.Acknowledgements.text?.length > 0) {
    sections.Acknowledgements.text = sections.Acknowledgements.text.map((str) =>
      str.replace("This person was created", "This profile was created")
    );
  }

  // Use some of the original text by wrapping it in 'use' tags
  if (sections.Biography.text?.length > 0) {
    const biographyText = sections.Biography.text.join("\n");
    const biographyDummy = $("<div>" + biographyText + "</div>");
    const use = biographyDummy.find("use");
    sections.Biography.use = [];
    use.each(function () {
      sections.Biography.use.push($(this).html());
    });
  }

  return sections;
}
