/*
Created By: Ian Beacall (Beacall-6)
*/
import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry.js";

const randomProfileFeature = {
  name: "Random Profile",
  id: "randomProfile",
  description:
    "Adds a Random Profile link to the Find menu. Left-click to get any random profile. Right-click to choose a location. This location is then used for all Random Profile calls until it is changed.",
  category: "Navigation/Find_Menu",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Jamie Nelson", wikitreeid: "Nelson-3486" }],
  defaultValue: true,
  pages: [isMainDomain],
  options: [
    {
      id: "constrainToWatchlist",
      label: "Constrain to Watchlist",
      type: OptionType.CHECKBOX,
      defaultValue: false,
    },
  ],
};

registerFeature(randomProfileFeature);
