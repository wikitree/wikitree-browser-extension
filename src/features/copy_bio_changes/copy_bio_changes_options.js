import { isProfileHistoryDetail } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Copy Bio Changes",
  id: "copyBioChanges",
  description:
    "Adds buttons to a profile's Change Details page to copy the biography " +
    "as it was before or after changes were made.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileHistoryDetail],
});
