import { isMainDomain, isPlusDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";

// The feature data for the myFeature feature
const usabilityTweaks = {
  name: "Usability Tweaks",
  id: "usabilityTweaks",
  description: "Miscellaneous tweaks.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [
    { name: "Florian Straub", wikitreeid: "Straub-620" },
    { name: "Riël Smit", wikitreeid: "Smit-641" },
  ],
  defaultValue: true,
  pages: [isMainDomain, isPlusDomain],
  options: [
    {
      id: "global",
      type: OptionType.GROUP,
      label: "Global",
      options: [
        {
          id: "removeDisablePreviewLinks",
          type: OptionType.CHECKBOX,
          label:
            "Remove the 'turn off preview' and 'turn off temporarily' buttons" +
            " from the profile previews so that you don't accidentally click them and lose the profile previews.",
          defaultValue: false,
        },
        {
          id: "categoryEditLinks",
          type: OptionType.CHECKBOX,
          label: "Add link to create non-existent categories in error messages",
          defaultValue: true,
        },
        {
          id: "biggerCheckboxesAndRadios",
          type: OptionType.CHECKBOX,
          label: "Bigger checkboxes and radio buttons",
          defaultValue: false,
        },
      ],
    },
    {
      id: "profilePage",
      type: OptionType.GROUP,
      label: "Profile",
      options: [
        {
          id: "removeMeButton",
          type: OptionType.CHECKBOX,
          label: "Add a button to profile pages to remove yourself as manager.",
          defaultValue: false,
        },
      ],
    },
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
          id: "andBetweenParentsExample",
          type: OptionType.CHECKBOX,
          label: "Insert 'and' between the parents in the wiki code example.",
          defaultValue: true,
        },
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
      id: "editSpacePage",
      type: OptionType.GROUP,
      label: "Free Space Pages",
      options: [
        {
          id: "leaveSpaceEditAfterSave",
          type: OptionType.CHECKBOX,
          label: "Leave edit view after saving",
          defaultValue: false,
        },
      ],
    },
    {
      id: "myConnections",
      type: OptionType.GROUP,
      label: "My Connections",
      options: [
        {
          id: "useHeadlineAsTitle",
          type: OptionType.CHECKBOX,
          label: 'Uses the headline of the page as tab title (instead of always displaying "My Connections")',
          defaultValue: true,
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
        {
          id: "scratchPadPosition",
          type: OptionType.RADIO,
          label: "Scratch Pad Position",
          values: [
            {
              value: false,
              text: "WikiTree Default",
            },
            {
              value: "topLeft",
              text: "Top Left",
            },
            {
              value: "topRight",
              text: "Top Right",
            },
            {
              value: "secondLeft",
              text: "2nd in Left Column",
            },
          ],
          defaultValue: false,
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
          id: "enhanceThonPages",
          type: OptionType.CHECKBOX,
          label: "Show differences and normalized popup on Thon stats pages.",
          defaultValue: true,
        },
      ],
    },
  ],
};
registerFeature(usabilityTweaks);
