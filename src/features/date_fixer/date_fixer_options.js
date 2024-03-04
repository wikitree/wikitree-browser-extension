/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import {
  isProfileEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
  isUploadPhoto,
  isNewSpace,
  isSpaceEdit,
} from "../../core/pageType";

registerFeature({
  name: "Date Fixer",
  id: "dateFixer",
  description:
    "Choose between MM-DD-YYYY and DD-MM-YYYY; Convert DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY, " +
    "or dates with non-English months to DD Mon YYYY; " +
    "Fixes typos in the date fields.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson, isUploadPhoto, isNewSpace, isSpaceEdit],
  options: [
    {
      id: "convertDD-MM-YYYY",
      type: OptionType.RADIO,
      label:
        "Assume DD-MM-YYYY. WikiTree assumes a date of AA-BB-YYYY to be in the US format MM-DD-YYYY. " +
        "This option controls how AA-BB-YYYY should be interpreted",
      values: [
        {
          value: "always",
          text: "Assume DD-MM-YYYY",
        },
        {
          value: false,
          text: "Assume MM-DD-YYYY",
        },
        {
          value: "askMe",
          text: "Ask me each time",
        },
      ],
      defaultValue: false,
    },
  ],
});
