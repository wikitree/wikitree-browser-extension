import { isProfileHistoryDetail } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Copy Previous Bio",
  id: "copyPreviousBio",
  description:
    "Adds a button to a profiles Change Details page to copy the biography as it was before changes were made.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileHistoryDetail],
});
