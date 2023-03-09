/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const randomProfileFeature = {
  name: "Random Profile",
  id: "randomProfile",
  description:
    "Adds a Random Profile link to the Find menu. Left-click to get any random profile. Right-click to choose a location. This location is then used for all Random Profile calls until it is changed.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [true],
};

registerFeature(randomProfileFeature);
