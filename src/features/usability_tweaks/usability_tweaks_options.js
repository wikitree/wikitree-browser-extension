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
  pages: [true],
  options: [
    {
      id: "saveSearchFormDataButton",
      type: OptionType.CHECKBOX,
      label: "Add a button to the search page to save the form data.",
      defaultValue: false,
    },
    {
      id: "removeTargetsFromEditFamilyLinks",
      type: OptionType.CHECKBOX,
      label: "Edit Page: Open Add/Remove/Replace links in the same tab.",
      defaultValue: false,
    },
    {
      id: "addRemoveConnectLinks",
      type: OptionType.CHECKBOX,
      label: "Edit Page: Replace Add/Remove/Replace links with Add, Remove, Connect links.",
      defaultValue: false,
    },
  ],
};
registerFeature(usabilityTweaks);
