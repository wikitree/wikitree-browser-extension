/*
Created By: Ian Beacall (Beacall-6)
*/

import { isProfileEdit, isProfileAddRelative } from "../../core/pageType";
import { registerFeature } from "../../core/options/options_registry.js";

const genderPredictorFeature = {
  name: "Gender Predictor",
  id: "genderPredictor",
  description:
    "Sets the gender on a new profile page based on the name and the gender frequency of it in the WikiTree database.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isProfileAddRelative],
};

registerFeature(genderPredictorFeature);
