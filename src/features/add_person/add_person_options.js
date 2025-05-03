/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileAddRelative, isAddUnrelatedPerson, isProfileEdit } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const addPersonRedesign = {
  name: "Add Person Redesign",
  id: "addPersonRedesign",
  description:
    "Redesigns the Add Person page for the convenience of advanced members. Some options might also affect editing existing profiles.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  defaultValue: false,
  pages: [isProfileAddRelative, isAddUnrelatedPerson, isProfileEdit],
  options: [
    {
      id: "additionalFields",
      type: OptionType.CHECKBOX,
      label: "Add additional fields (Prefix, Nicknames, Other Last Names, Suffix, and Biography)",
      defaultValue: false,
    },
    {
      id: "shortenInputBoxes",
      type: OptionType.CHECKBOX,
      label: "Shorten some boxes (Prefix, Suffix, Dates, Sex at Birth)",
      defaultValue: false,
    },
    {
      id: "tabbingOptions",
      type: OptionType.CHECKBOX,
      label: "Show 'minimal tabbing' toggle (makes tab key skip less common input fields)",
      defaultValue: true,
    },
    {
      id: "categoryPicker",
      type: OptionType.CHECKBOX,
      label: "Add a category picker",
      defaultValue: true,
    },
    {
      id: "sourceHints",
      type: OptionType.CHECKBOX,
      label: "Remove source hints",
      defaultValue: false,
    },
    {
      id: "addResearchNotesSection",
      type: OptionType.CHECKBOX,
      label: "Add a Research Notes section (in 'Advanced' mode)",
      defaultValue: false,
    },
  ],
};

registerFeature(addPersonRedesign);
