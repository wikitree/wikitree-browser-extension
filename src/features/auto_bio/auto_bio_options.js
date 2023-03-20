import { registerFeature, OptionType } from "../../core/options/options_registry";

const autoBio = {
  name: "Auto Bio",
  id: "autoBio",
  description: "Generates an automated biography from available data.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
  defaultValue: true,
  options: [
    {
      id: "boldNames",
      type: OptionType.CHECKBOX,
      label: "Bold names for profile person and spouse(s)",
      defaultValue: true,
    },

    {
      id: "deathPosition",
      type: OptionType.CHECKBOX,
      label: "Death details immediately after birth details",
      defaultValue: false,
    },
    {
      id: "inlineCitations",
      type: OptionType.CHECKBOX,
      label: "Inline citations",
      defaultValue: true,
    },
    {
      id: "SouthAfricaProject",
      type: OptionType.CHECKBOX,
      label: "Only the South Africa Project style",
      defaultValue: false,
    },
    {
      id: "fullNameOrBirthName",
      type: OptionType.RADIO,
      label: "Name format",
      values: [
        {
          value: "FullName",
          text: "Include last current last name (if different from last name at birth) (e.g. Mary (Jones) Smith)",
        },
        {
          value: "BirthName",
          text: "Birth name (e.g. Mary Jones)",
        },
      ],
      defaultValue: "BirthName",
    },
    {
      id: "diedWord",
      type: OptionType.RADIO,
      label: "'Died' or 'passed away'",
      values: [
        {
          value: "died",
          text: "died",
        },
        {
          value: "passed away",
          text: "passed away",
        },
      ],
      defaultValue: "died",
    },
    {
      id: "timelineGroup",
      type: OptionType.GROUP,
      label: "Timeline",
      options: [
        {
          id: "timeline",
          type: OptionType.RADIO,
          label: "Type of timeline",
          values: [
            {
              value: "table",
              text: "Table",
            },
            {
              value: "SA",
              text: "South Africa Project style",
            },
            {
              value: "none",
              text: "None",
            },
          ],
          defaultValue: "none",
        },
        {
          id: "timelineLocations",
          type: OptionType.RADIO,
          label: "Locations",
          values: [
            {
              value: "full",
              text: "Full",
            },
            {
              value: "minimal",
              text: "Minimal",
            },
          ],
          defaultValue: "minimal",
        },
      ],
    },

    {
      id: "datesGroup",
      type: OptionType.GROUP,
      label: "Dates",
      options: [
        {
          id: "dateFormat",
          type: OptionType.SELECT,
          label: "Date format",
          values: [
            {
              value: "MDY",
              text: "November 24, 1859",
            },
            {
              value: "DMY",
              text: "24 November 1859",
            },
            {
              value: "sMDY",
              text: "Nov 24, 1859",
            },
            {
              value: "DsMY",
              text: "24 Nov 1859",
            },
          ],
          defaultValue: "FullMonthDDYYYY",
        },
        {
          id: "dateStatusFormat",
          type: OptionType.RADIO,
          label: "Date status format",
          values: [
            {
              value: "words",
              text: "Words (before, after, about)",
            },
            {
              value: "abbreviations",
              text: "Abbreviations (bef., aft., abt.)",
            },
            {
              value: "symbols",
              text: "Symbols (<, >, ~)",
            },
          ],
          defaultValue: "abbreviations",
        },
      ],
    },

    {
      id: "categoriesAndStickersGroup",
      type: OptionType.GROUP,
      label: "Categories and stickers",
      options: [
        {
          id: "locationCategories",
          type: OptionType.CHECKBOX,
          label: "Add location categories",
          defaultValue: true,
        },
        {
          id: "needsProfilesCreatedCategory",
          type: OptionType.CHECKBOX,
          label: "Add Needs Profiles Created category",
          defaultValue: true,
        },
        {
          id: "unsourced",
          type: OptionType.CHECKBOX,
          label: "Add Unsourced template to unsourced profiles",
          defaultValue: true,
        },
        {
          id: "diedYoung",
          type: OptionType.CHECKBOX,
          label: "Add Died Young sticker for people who died aged 16 or younger",
          defaultValue: true,
        },
      ],
    },
    {
      id: "spouseDetailsGroup",
      type: OptionType.GROUP,
      label: "Spouse",
      options: [
        {
          id: "spouseDetails",
          type: OptionType.CHECKBOX,
          label: "Include spouse details",
          defaultValue: true,
        },
        {
          id: "spouseParentDetails",
          type: OptionType.CHECKBOX,
          label: "Also include spouse parent details",
          defaultValue: true,
        },
      ],
    },

    {
      id: "familyLists",
      type: OptionType.GROUP,
      label: "Family lists",
      options: [
        {
          id: "siblingList",
          type: OptionType.CHECKBOX,
          label: "Sibling list",
          defaultValue: false,
        },
        {
          id: "childList",
          type: OptionType.CHECKBOX,
          label: "Child list",
          defaultValue: true,
        },
        {
          id: "familyListStyle",
          type: OptionType.RADIO,
          label: "Style",
          values: [
            {
              value: "bullets",
              text: "Bullets",
            },
            {
              value: "numbers",
              text: "Numbers",
            },
          ],
          defaultValue: "bullets",
        },
        {
          id: "addKnown",
          type: OptionType.CHECKBOX,
          label: "Add 'known' when the 'No more children' box is not checked",
          defaultValue: false,
        },
        {
          id: "longDates",
          type: OptionType.CHECKBOX,
          label: "Use long dates (e.g. 24 November 1859)",
          defaultValue: false,
        },
        {
          id: "notDeathDate",
          type: OptionType.CHECKBOX,
          label: "Do not show death dates",
          defaultValue: false,
        },
      ],
    },
    {
      id: "fixLocations",
      type: OptionType.GROUP,
      label: "Fix locations",
      options: [
        {
          id: "checkUS",
          type: OptionType.CHECKBOX,
          label: "Remove 'United States' before the state joined the Union. Add 'United States' if it's missing.",
          defaultValue: true,
        },
        {
          id: "changeUS",
          type: OptionType.CHECKBOX,
          label: "Change 'United States' variants (e.g. 'USA') to 'United States'.",
          defaultValue: true,
        },
        {
          id: "expandStates",
          type: OptionType.CHECKBOX,
          label: "Expand US state names (e.g. 'OK' --> 'Oklahoma').",
          defaultValue: true,
        },
        {
          id: "checkUK",
          type: OptionType.CHECKBOX,
          label: "Add or remove 'United Kingdom' depending on the date.",
          defaultValue: true,
        },
        {
          id: "nativeNames",
          type: OptionType.CHECKBOX,
          label: "Change country names from English to their native name.",
          defaultValue: true,
        },
        {
          id: "checkOtherCountries",
          type: OptionType.CHECKBOX,
          label:
            "Check other countries for their native name and creation date of the state. (Information given in Notes.)",
          defaultValue: true,
        },
      ],
      defaultValue: true,
    },
  ],
};

registerFeature(autoBio);
