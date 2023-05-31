/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileAddRelative, isAddUnrelatedPerson } from "../../core/pageType";
import { registerFeature } from "../../core/options/options_registry.js";

const genderPredictorFeature = {
  name: "Gender Predictor",
  id: "genderPredictor",
  description:
    "Sets the gender on a new profile page based on the name and the gender frequency of it in the WikiTree database.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
};

registerFeature(genderPredictorFeature);
