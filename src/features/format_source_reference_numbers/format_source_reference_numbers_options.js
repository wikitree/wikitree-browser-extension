/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfilePage } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const formatSourceReferenceNumbersObject = {
  name: "Format Source Reference Numbers",
  id: "formatSourceReferenceNumbers",
  description: "Hide source reference numbers or make them smaller.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
  options: [
    {
      id: "mode",
      type: OptionType.RADIO,
      label: "Options",
      values: [
        {
          value: "hide",
          text: "Hide them",
        },
        {
          value: "makeSmaller",
          text: "Make them smaller",
        },
      ],
      defaultValue: "makeSmaller",
    },
  ],
};

registerFeature(formatSourceReferenceNumbersObject);
