import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const randomProfileFeature = {
  name: "Random Profile",
  id: "randomProfile",
  description: "Adds a Random Profile link to the Find menu.",
  category: "Global",
  defaultValue: true,
};

registerFeature(randomProfileFeature);
