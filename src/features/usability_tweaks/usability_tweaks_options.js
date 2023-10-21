import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";

// The feature data for the myFeature feature
const usabilityTweaks = {
  name: "Usability Tweaks",
  id: "usabilityTweaks",
  description: "Miscellaneous tweaks.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
  options: [
    {
      id: "addPerson",
      type: OptionType.GROUP,
      label: "Add Person",
      options: [
        {
          id: "focusFirstNameField",
          type: OptionType.CHECKBOX,
          label: "Put the focus in the First Name field.",
          defaultValue: false,
        },
      ],
    },
    {
      id: "editPage",
      type: OptionType.GROUP,
      label: "Profile edit page",
      options: [
        {
          id: "removeTargetsFromEditFamilyLinks",
          type: OptionType.CHECKBOX,
          label: "Open Add/Remove/Replace links in the same tab.",
          defaultValue: false,
        },
        {
          id: "addRemoveConnectLinks",
          type: OptionType.CHECKBOX,
          label: "Replace Add/Remove/Replace links with Add, Remove, Connect links.",
          defaultValue: false,
        },
        {
          id: "rememberTextareaHeight",
          type: OptionType.CHECKBOX,
          label: "Remember the height of the editor on the edit page.",
          defaultValue: false,
        },
      ],
    },
    {
      id: "navHomePage",
      type: OptionType.GROUP,
      label: "Navigation Home Page",
      options: [
        {
          id: "addScratchPadButton",
          type: OptionType.CHECKBOX,
          label: "Add an Edit/Save button above the Scratch Pad.",
          defaultValue: true,
        },
      ],
    },
    {
      id: "searchPage",
      type: OptionType.GROUP,
      label: "Search page",
      options: [
        {
          id: "saveSearchFormDataButton",
          type: OptionType.CHECKBOX,
          label: "Add a button to the search page to save the form data to populate fields on the Add Person page.",
          defaultValue: false,
        },
        {
          id: "onlyMembers",
          type: OptionType.CHECKBOX,
          label: "Add a link to show only active members.",
          defaultValue: true,
        },
      ],
    },
    {
      id: "other",
      type: OptionType.GROUP,
      label: "Other",
      options: [
        {
          id: "fixPrintingBug",
          type: OptionType.CHECKBOX,
          label: "Fix a known bug in Chrome on Windows 10 that prevents good printing of WikiTree profiles.",
          defaultValue: false,
        },
      ],
    },
  ],
};
registerFeature(usabilityTweaks);
