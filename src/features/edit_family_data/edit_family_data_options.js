import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileAddRelative } from "../../core/pageType";
registerFeature({
  name: "Dates/Locations on New Profile Page",
  id: "editFamilyData",
  description:
    "Adds the dates and locations of the profile person to a new profile page (for a parent, sibling, etc.).",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileAddRelative],
  options: [
    {
      id: "patronymic",
      type: OptionType.CHECKBOX,
      label: "Add correct Welsh patronymic as the last name at birth",
      defaultValue: true,
    },
  ],
});
