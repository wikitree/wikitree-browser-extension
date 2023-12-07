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
    "Converts DD/MM/YYY and DD.MM.YYYY (and, optionally, DD-MM-YYYY) " +
    "or dates with non-English months to DD Mon YYYY or DD Month YYYY; " +
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
        "Convert DD-MM-YYYY. (WikiTree accepts the US date format MM-DD-YYYY. " +
        "This option can convert DD-MM-YYYY to an accepted format every time.)",
      values: [
        {
          value: "always",
          text: "Always",
        },
        {
          value: "askMe",
          text: "Ask me each time",
        },
        {
          value: false,
          text: "Never",
        },
      ],
      defaultValue: false,
    },
  ],
});
