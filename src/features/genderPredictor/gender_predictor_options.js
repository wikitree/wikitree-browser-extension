import {
  registerFeature,
  OptionType,
} from "../../core/options/options_registry.js";

const predictGenderFeature = {
  name: "Gender Predictor",
  id: "genderpredictor",
  description:
    "Sets the gender on a new profile page based on the name and the gender frequency of it in the WikiTree database.",
  category: "Editing",
};

registerFeature(predictGenderFeature);
