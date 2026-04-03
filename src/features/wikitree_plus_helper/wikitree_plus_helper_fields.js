/**
 * Field definitions for WikiTree+ Query Builder
 */

export function createFieldDefs(magicWordsList, buildSuggestionsOptions, getUserWtId) {
  const magicWordFields = [];

  // Create a field for each magic words category (optgroup)
  if (Array.isArray(magicWordsList)) {
    magicWordsList.forEach((group) => {
      if (group.label && group.options) {
        magicWordFields.push({
          id: `MagicWords_${group.label.replace(/\s+/g, "_")}`,
          label: group.label,
          kind: "raw",
          input: "select",
          options: group.options,
          group: "Magic Words",
        });
      }
    });
  }

  return [
    // Magic Words - category fields
    ...magicWordFields,

    // Suggestions - special field
    {
      id: "Suggestions",
      label: "Suggestions",
      kind: "index",
      input: "select",
      options: buildSuggestionsOptions,
      group: "Suggestions",
    },

    // Profile Status
    {
      id: "ProfileStatus",
      label: "Profile Status",
      kind: "raw",
      input: "select",
      options: ["Open", "Unsourced", "Unconnected", "Orphan", "Notables"],
      group: "Profile Status",
    },

    // Dates & Time Periods
    {
      id: "BirthYear",
      label: "Birth Year (specific)",
      kind: "prefix",
      prefix: "B",
      input: "text",
      placeholder: "e.g. 1850 (builds B1850)",
      group: "Dates",
    },
    {
      id: "DeathYear",
      label: "Death Year (specific)",
      kind: "prefix",
      prefix: "D",
      input: "text",
      placeholder: "e.g. 1920 (builds D1920)",
      group: "Dates",
    },
    {
      id: "Decade",
      label: "Decade (custom)",
      kind: "suffix",
      suffix: "s",
      input: "text",
      placeholder: "e.g. 1780 (builds 1780s)",
      group: "Dates",
    },

    // Identity / names (documented in help)
    {
      id: "WikiTreeID",
      label: "WikiTreeID",
      kind: "index",
      input: "text",
      placeholder: "e.g. Darwin-15",
      group: "Names",
    },
    {
      id: "LastNameAtBirth",
      label: "LastNameAtBirth",
      kind: "index",
      input: "text",
      placeholder: "e.g. Darwin",
      group: "Names",
    },
    {
      id: "AllLastNames",
      label: "AllLastNames",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Darwin"',
      group: "Names",
    },
    { id: "FirstName", label: "FirstName", kind: "index", input: "text", placeholder: "e.g. John", group: "Names" },

    // Locations (simple index=value form)
    {
      id: "Location",
      label: "Location (any B/M/D)",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shrewsbury, England"',
      group: "Locations",
    },
    {
      id: "BirthLocation",
      label: "BirthLocation",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shrewsbury, England"',
      group: "Locations",
    },
    {
      id: "MarriageLocation",
      label: "MarriageLocation",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shrewsbury, England"',
      group: "Locations",
    },
    {
      id: "DeathLocation",
      label: "DeathLocation",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Manchester England"',
      group: "Locations",
    },

    // Location table fields (country/region) - from England Project doc
    {
      id: "birthcountry",
      label: "birthcountry",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "England", "UnknownCountry"',
      group: "Location Table",
    },
    {
      id: "birthregion",
      label: "birthregion",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shropshire", "UnknownRegion"',
      group: "Location Table",
    },
    {
      id: "deathcountry",
      label: "deathcountry",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "England", "UnknownCountry"',
      group: "Location Table",
    },
    {
      id: "deathregion",
      label: "deathregion",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shropshire", "UnknownRegion"',
      group: "Location Table",
    },
    {
      id: "marriagecountry",
      label: "marriagecountry",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "England", "UnknownCountry"',
      group: "Location Table",
    },
    {
      id: "marriageregion",
      label: "marriageregion",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shropshire", "UnknownRegion"',
      group: "Location Table",
    },

    // Categories & templates (documented)
    {
      id: "CategoryFull",
      label: "CategoryFull",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Shrewsbury, Shropshire"',
      group: "Categories and Templates",
    },
    {
      id: "CategoryWord",
      label: "CategoryWord",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "Elphin"',
      group: "Categories and Templates",
    },
    {
      id: "TemplateText",
      label: "TemplateText",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "One Place Study"',
      group: "Categories and Templates",
    },
    {
      id: "TemplateFull",
      label: "TemplateFull",
      kind: "index",
      input: "text",
      placeholder: 'e.g. "One Place Study/Nantwich, Cheshire"',
      group: "Categories and Templates",
    },

    // Relations & Tree
    {
      id: "Tree",
      label: "Tree",
      kind: "index",
      input: "text",
      placeholder: "e.g. Tree123 or unconnected",
      group: "Relations",
    },
    {
      id: "Ancestors",
      label: "Ancestors",
      kind: "index",
      input: "text",
      placeholder: 'e.g. Tudor-18 or "Van Veenendaal-20"',
      group: "Relations",
    },
    {
      id: "Descendants",
      label: "Descendants",
      kind: "index",
      input: "text",
      placeholder: 'e.g. Tudor-18 or "Van Hoorn-230"',
      group: "Relations",
    },
    {
      id: "CC7",
      label: "CC7",
      kind: "index",
      input: "text",
      placeholder: "e.g. Tudor-18 or 13064898",
      group: "Relations",
    },

    // Management & editing (documented)
    {
      id: "Creator_",
      label: "Creator_",
      kind: "prefix",
      prefix: "Creator_",
      input: "text",
      placeholder: () => `e.g. ${getUserWtId() || "YourID-123"}`,
      group: "Management",
    },
    {
      id: "changesmonth",
      label: "changesmonth",
      kind: "index",
      input: "text",
      placeholder: "e.g. 202501",
      group: "Management",
    },
    {
      id: "created",
      label: "created",
      kind: "index",
      input: "text",
      placeholder: "e.g. created_2025",
      group: "Management",
    },

    // SQL (must come last within each OR-group)
    {
      id: "sql",
      label: 'sql="..." (wizard)',
      kind: "sql",
      input: "wizard",
      group: "Advanced",
    },
  ];
}
