/*
Created By: Miyako Jones (Jones-108375)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isFindAGraveCemeteryList } from "../../core/pageType";

registerFeature({
  name: "Find A Grave Memorial Extractor",
  id: "findAGraveMemorialExtractor",
  description:
    "Extracts memorial data from a Find a Grave cemetery list and downloads it as a CSV. Automatically matches memorials with WikiTree profiles. Optionally opens each memorial to add GPS coordinates and a surname, maiden name and given names breakdown. Long lists are read 50 pages (1000 memorials) at a time, and you choose which pages.",
  category: "Other",
  creators: [{ name: "Miyako Jones", wikitreeid: "Jones-108375" }],
  contributors: [{ name: "Azure Robinson", wikitreeid: "Robinson-27225" }],
  defaultValue: false,
  pages: [isFindAGraveCemeteryList],
  options: [
    {
      id: "fetchMemorialPages",
      type: OptionType.CHECKBOX,
      label:
        "Add GPS coordinates. Opens each memorial (about a second each, so a long list takes a while) and gives a CSV of: memorial ID, surname, maiden name, given names, WikiTree ID, birth date, death date, latitude, longitude and plot. Off gives the original quick list export: ID, name, dates, photo flags and links.",
      defaultValue: false,
    },
  ],
});
