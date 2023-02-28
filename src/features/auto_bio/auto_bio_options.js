import { registerFeature, OptionType } from "../../core/options/options_registry";

const autoBio = {
  name: "Auto Bio",
  id: "autoBio",
  description: "Generates an automated biography from available data.",
  category: "Editing",
  defaultValue: true,
  options: [
    {
      id: "startWithName",
      type: OptionType.RADIO,
      label: "Start with",
      values: [
        {
          value: "FullName",
          text: "Full name",
        },
        {
          value: "BirthName",
          text: "Birth name",
        },
      ],
      defaultValue: "BirthName",
    },
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
      id: "timeline",
      type: OptionType.RADIO,
      label: "Timeline",
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
      ],
    },
  ],
};

registerFeature(autoBio);
