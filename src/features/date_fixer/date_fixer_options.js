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
      type: OptionType.CHECKBOX,
      label:
        "Convert DD-MM-YYYY. (WikiTree accepts the US date format MM-DD-YYYY. " +
        "If you're not American, you may use DD-MM-YYYY. " +
        "This option will convert your DD-MM-YYYY to an accepted format.)",
      defaultValue: false,
    },
  ],
});
