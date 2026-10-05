/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isMainDomain } from "../../core/pageType";

registerFeature({
  name: "Relationship Finder Options",
  id: "relationshipFinderOptions",
  description:
    "Customize Relationship Finder results with linked spouses, comparison layouts, generation details, and a copied report.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
  options: [
    { id: "genderColors", type: OptionType.CHECKBOX, label: "Use gender colours in both views", defaultValue: true },
    {
      id: "layout",
      type: OptionType.SELECT,
      label: "Default result layout",
      defaultValue: "sideBySide",
      values: [
        { value: "original", text: "Original" },
        { value: "sideBySide", text: "Side by side" },
      ],
      comment:
        "You can also switch layouts directly above the result. Side by side runs from the shared ancestor down to each person.",
    },
    {
      id: "sharedAncestorBox",
      type: OptionType.CHECKBOX,
      label: "Also show the shared ancestor box in Original view",
      defaultValue: true,
    },
    { id: "explainGenerations", type: OptionType.CHECKBOX, label: "Explain generation distances", defaultValue: true },
    {
      id: "highlightLineage",
      type: OptionType.CHECKBOX,
      label: "Emphasize ancestors in the direct family path",
      defaultValue: true,
    },
    {
      id: "showStatus",
      type: OptionType.CHECKBOX,
      label: "Show relationship status",
      defaultValue: true,
      comment:
        "Uses WikiTree’s status icons in Side by side and text labels in Original. Unmarked relationships remain unmarked.",
    },
    { id: "copyReport", type: OptionType.CHECKBOX, label: "Add Copy linked report button", defaultValue: true },
    {
      id: "noIndentation",
      type: OptionType.CHECKBOX,
      label: "Remove generation indentation",
      defaultValue: true,
    },
    {
      id: "addSpouses",
      type: OptionType.CHECKBOX,
      label: "Show spouses beside each ancestor",
      comment: "Adds links to available spouse profiles. Private ancestors without a profile link are left unchanged.",
      defaultValue: true,
    },
  ],
});
