/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature } from "../../core/options/options_registry";
import { isSpecialProfileAdoptionsSurname } from "../../core/pageType";

registerFeature({
  name: "Profile Adoption Surname Table",
  id: "profileAdoptionSurnameTable",
  description:
    "On the profile adoption page (Special:Adoptions) for a surname, replaces the list with a sortable, filterable table of up to 1000 profiles, with names, dates and places.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpecialProfileAdoptionsSurname],
});
