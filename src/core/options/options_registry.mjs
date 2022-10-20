// an array of information about features
const features = [
  {
    name: "Printer Friendly Bio",
    id: "printerFriendly",
    description: "Change the page to a printer-friendly one.",
    category: "Global",
  },
  {
    name: "Source Previews",
    id: "sPreviews",
    description: "Enable source previews on inline references.",
    category: "Global",
  },
  {
    name: "Space Page Previews",
    id: "spacePreviews",
    description: "Enable previews of Space Pages on hover.",
    category: "Global",
  },
  {
    name: "Apps Menu",
    id: "appsMenu",
    description: "Adds an apps submenu to the Find menu.",
    category: "Global",
  },
  {
    name: "WikiTree+ Edit Helper",
    id: "wtplus",
    description: "Adds multiple editing features.",
    category: "Editing",
  },
  {
    name: "Collapsible Descendants Tree",
    id: "collapsibleDescendantsTree",
    description: "Makes the descendants tree on profile pages collapsible.",
    category: "Profile",
  },
  {
    name: "AKA Name Links",
    id: "akaNameLinks",
    description:
      'Adds surname page links to the "aka" names on the profile page.',
    category: "Profile",
  },
  {
    name: "Family Timeline",
    id: "familyTimeline",
    description:
      "Displays a family timeline. A button is added to the profile submenu.",
    category: "Profile",
  },
  {
    name: "Draft List",
    id: "draftList",
    description:
      "Adds a button to the Find menu to show your uncommitted drafts.",
    category: "Global",
  },
  {
    name: "Random Profile",
    id: "randomProfile",
    description: "Adds a Random Profile link to the Find menu.",
    category: "Global",
  },
  {
    name: "Distance and Relationship",
    id: "distanceAndRelationship",
    description:
      "Adds the distance (degrees) between you and the profile person and any relationship between you.",
    category: "Profile",
  },
  {
    name: "Locations Helper",
    id: "locationsHelper",
    description:
      "Manipulates the suggested locations, highlighting likely correct locations," +
      " based on family members' locations, and demoting likely wrong locations, based on the dates.",
    category: "Editing",
  },
  {
    name: "Dark Mode",
    id: "darkMode",
    description: "Make WikiTree dark.",
    category: "Style",
  },
  {
    name: "Family Group",
    id: "familyGroup",
    description:
      "Display dates and locations of all family members. A button is added to the profile submenu.",
    category: "Profile",
  },
  {
    name: "Automatic GEDCOM Cleanup (AGC)",
    id: "agc",
    description:
      "Reformats a biography and updates data fields when the profile was created from a GEDCOM.",
    category: "Editing",
    options: [
      {
        id: "bioMainText",
        type: "group",
        label: "Biography main text",
        options: [
          {
            id: "spelling",
            type: "select",
            label: "Spelling",
            values: [
              {
                value: "en_uk",
                text: "UK English",
              },
              {
                value: "en_us",
                text: "US English",
              },
            ],
            defaultValue: "en_uk",   
          },
          {
            id: "include_age",
            type: "select",
            label: "Add age to narrative events",
            values: [
              {
                value: "none",
                text: "None",
              },
              {
                value: "death_only",
                text: "On death only",
              },
              {
                value: "death_marriage",
                text: "On death and marriages only",
              },
              {
                value: "most",
                text: "On most events",
              },
            ],
            defaultValue: "most",   
            defaultTestValue: "none",   
          },
          {
            id: "narrative_includeCountry",
            type: "select",
            label: "Include country in locations in narrative events (if known)",
            values: [
              {
                value: "always",
                text: "Always (if present already in input bio)",
              },
              {
                value: "first",
                text: "Only if it is first event with that country or different to previous event",
              },
              {
                value: "never",
                text: "Never include country",
              },
            ],
            defaultValue: "always",   
          },
          {
            id: "narrative_standardizeCountry",
            type: "checkbox",
            label: 'In narrative text use a standard/abbreviated name for the country (e.g. "England" rather than "England, United Kingdom")',
            defaultValue: false,
          },
          {
            id: "narrative_addAtUnknownLocation",
            type: "checkbox",
            label: 'In narrative text, if a fact has no location, add the text "at an unknown location"',
            defaultValue: false,
            defaultTestValue: true,
          },
          {
            id: "narrative_useResidenceData",
            type: "checkbox",
            label: 'If an employment, residence or census fact has a known record type start the narrative event with that',
            defaultValue: true,   
          },
          {
            id: "narrative_useFullCensusDate",
            type: "checkbox",
            label: 'If a census style narrative event starts with just the date then use the full date if known. E.g. "On 2 April 1911 John was living in ..."',
            defaultValue: true,   
          },
          {
            id: "include_externalMedia",
            type: "checkbox",
            label: 'Add an External Media section to biography if there are files referenced',
            defaultValue: true,   
          },
          {
            id: "include_mapLinks",
            type: "checkbox",
            label: 'Add a link to OpenStreetMap if a fact location includes latitude and longitude',
            defaultValue: true,   
          },
          {
            id: "removeGedcomVerbiage",
            type: "checkbox",
            label: 'Remove the GEDCOM import text that states which gedcom the profile was created from (only do this if the profile will be fully cleaned up and sourced)',
            defaultValue: true,   
          },
        ],
      },
      {
        id: "refsAndSources",
        type: "group",
        label: "References and sources",
        options: [
          {
            id: "references_named",
            type: "select",
            label: "When to use named references",
            values: [
              {
                value: "never",
                text: "Never: Each source is only referenced once. Sources will be listed in chronological order",
              },
              {
                value: "minimal",
                text: "Minimal: Only if it would otherwise leave a narrative event with no references. If so no more than one reference will be used",
              },
              {
                value: "selective",
                text: "Selective: References sources more than once only when it likely adds more accurate information to an event",
              },
              {
                value: "multiple_use",
                text: "Multiple Use: Use named references whenever a fact has multiple sources",
              },
              {
                value: "all",
                text: "All: Always named references (not recommended)",
              },
            ],
            defaultValue: "selective",
            defaultTestValue: "never",
          },
          {
            id: "references_accessedDate",
            type: "select",
            label: "Add an accessed date to citation",
            values: [
              {
                value: "none",
                text: "None: Don't add it",
              },
              {
                value: "unknown",
                text: 'Unknown: Add "(accessed unknown date)"',
              },
              {
                value: "before",
                text: 'Before: Add "(accessed before [date])". For recent GEDCOMs the date is today. For older format ones it is the date it was imported if known',
              },
              {
                value: "exact",
                text: 'Today: Add "(accessed [today\'s date])". The assumption is that you will access each source after running AGC',
              },
            ],
            defaultValue: "before",
            defaultTestValue: "today",   
          },
          {
            id: "references_addNewlineBeforeFirst",
            type: "checkbox",
            label: 'Add a newline before the first reference on a narrative event',
            defaultValue: false,   
          },
          {
            id: "references_addNewline",
            type: "checkbox",
            label: 'Add a newline between each reference on a narrative event',
            defaultValue: false,
            defaultTestValue: true,   
          },
          {
            id: "references_addNewlineWithin",
            type: "checkbox",
            label: 'Add newlines within each reference on a narrative event (after the <ref> and before the </ref>)',
            defaultValue: true,
            defaultTestValue: false,   
          },
          {
            id: "references_meaningfulNames",
            type: "checkbox",
            label: 'Add a meaningful name at the start of each reference (this shows up in the "Sources" section)',
            defaultValue: true,   
          },
          {
            id: "sources_addFreeLinksForSubscriptionSources",
            type: "checkbox",
            label: 'For subscription sources, attempt to add links to free sources as well (usually links that do a search)',
            defaultValue: true,   
          },
          {
            id: "sourcesWithNoDate",
            type: "group",
            label: "Sources with no date or associated fact",
            options: [
              {
                type: "textLine",
                label: 'Some of these are common and can be suppressed from being output if not desired in the bio:',
              },
              {
                id: "sources_supressChildBaptisms",
                type: "checkbox",
                label: 'Ignore child baptism sources',
                defaultValue: false,   
              },
              {
                id: "sources_supressChildMarriages",
                type: "checkbox",
                label: 'Ignore child marriage sources',
                defaultValue: false,   
              },
            ],
          },
        ],
      },
      {
        id: "researchNotes",
        type: "group",
        label: "Research Notes",
        options: [
          {
            id: "researchNotes_alternateNames",
            type: "checkbox",
            label: 'Add an Alternate Names section to Research Notes if there are multiple names',
            defaultValue: true,   
          },
          {
            id: "issuesToBeChecked",
            type: "group",
            label: "Issues to be checked",
            options: [
              {
                id: "researchNotes_includeIssuesToBeChecked",
                type: "checkbox",
                label: 'If issues are found report them in the "Issues to be checked" section under Research Notes',
                defaultValue: true,   
              },
              {
                id: "suppressedIssues",
                type: "group",
                label: "Suppress some issues",
                options: [
                  {
                    type: "textLine",
                    label: 'If issues are being reported the following common and harmless ones can be suppressed by unchecking the box:',
                  },
                  {
                    id: "researchNotes_issueForClnToLastHusband",
                    type: "checkbox",
                    label: 'Report if changing <b>Current Last Name</b> to last name of last husband',
                    isHtmlInLabel: true,
                    defaultValue: true,   
                  },
                  {
                    id: "researchNotes_issueForBirthToBeforeBaptism",
                    type: "checkbox",
                    label: 'Report if changing <b>Birth Date</b> to <i>before</i> the baptism date',
                    isHtmlInLabel: true,
                    defaultValue: true,   
                  },
                  {
                    id: "researchNotes_issueForDeathToBeforeBurial",
                    type: "checkbox",
                    label: 'Report if changing <b>Death Date</b> to <i>before</i> the burial date',
                    isHtmlInLabel: true,
                    defaultValue: true,   
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "otherFields",
        type: "group",
        label: "Other fields of the profile",
        options: [
          {
            id: "otherFields_useBaptismForBirthDate",
            type: "checkbox",
            label: 'If there is an exact baptism date in the same year as a year-only birth date then change the <b>Birth Date</b> field of the profile to be <i>before</i> the baptism date',
            isHtmlInLabel: true,
            defaultValue: true,   
          },
          {
            id: "otherFields_useBurialForDeathDate",
            type: "checkbox",
            label: 'If there is an exact burial date in the same year as a year-only death date then change the <b>Death Date</b> field of the profile to be <i>before</i> the burial date',
            isHtmlInLabel: true,
            defaultValue: true,   
          },
          {
            id: "otherFields_useLastHusbandNameForCurrentLastName",
            type: "checkbox",
            label: 'For female profiles, if the <b>Current Last Name</b> is the <b>LNAB</b> but there are marriages and the last husband\'s name is known then change the <b>CLN</b> to that',
            isHtmlInLabel: true,
            defaultValue: true,   
          },
          {
            id: "dataFields_moveNamesFromFirstToMiddle",
            type: "select",
            label: "For old GEDCOM imports move additional names from the Proper First Name field to the Middle Name field",
            values: [
              {
                value: "someCountries",
                text: "Only if the profile is in UK or USA",
              },
              {
                value: "never",
                text: "Never do this",
              },
            ],
            defaultValue: "someCountries",   
          },
        ],
      },
    ],
  },
  {
    name: 'BioCheck',
    id: 'bioCheck',
    description: 'Check biography style and sources.',
    category: 'Editing',
  },
  {
    name: "Category Finder Pins",
    id: "categoryFinderPins",
    description:
      "Adds pins to Category Finder results (on the edit page), similar to the pins in the location dropdown.  These pins link to the category page for you to check that you have the right category.",
    category: "Editing",
  },
];

function getFeatureData(featureId) {
  for (let feature of features) {
    if (feature.id == featureId) {
      return feature;
    }
  }
}

function fillDefaultValuesForOptions(defaultValues, options, useTestDefaults) {

  for (let option of options) {

    if (option.type == "group") {
      if (option.options) {
        fillDefaultValuesForOptions(defaultValues, option.options, useTestDefaults);
      }
    } else if (option.type == "comment" || option.type == "textLine") {
      // no defaultValues property wanted for these
    } else {

      if (option.id) {
        let defaultValue = option.defaultValue;

        if (useTestDefaults && option.defaultTestValue !== undefined) {
          defaultValue = option.defaultTestValue;
        }

        if (defaultValue !== undefined) {
          defaultValues[option.id] = defaultValue;
        }
      }
    }
  }
}

function getDefaultOptionValuesForFeature(featureId, useTestDefaults = false) {

  console.log("getDefaultOptionValuesForFeature: featureId is: " + featureId);

  const feature = getFeatureData(featureId);

  if (!feature) {
    return undefined;
  }

  const defaultValues = {};
  fillDefaultValuesForOptions(defaultValues, feature.options, useTestDefaults);

  console.log("getDefaultOptionValuesForFeature (at end): defaultValues is:");
  console.log(defaultValues);

  return defaultValues;
}

export { features, getDefaultOptionValuesForFeature };