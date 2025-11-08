/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isSpecialWatchedList, isSearchPage } from "../../core/pageType";

registerFeature({
  name: "Search and Watchlist Table Options",
  id: "surnameTable",
  description: "Adds columns and more functionality to Search and Watchlist pages. Click the More button.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [
    { name: "Florian Straub", wikitreeid: "Straub-620" },
    { name: "Riël Smit", wikitreeid: "Smit-641" },
  ],
  defaultValue: false,
  pages: [isSpecialWatchedList, isSearchPage],
  options: [
    {
      id: "ShowYouArePMorTL",
      type: OptionType.CHECKBOX,
      label: "Show if you are the profile manager or on the trusted list",
      defaultValue: true,
    },
    {
      id: "NumberTheTable",
      type: OptionType.CHECKBOX,
      label: "Number the table",
      defaultValue: true,
    },
    {
      id: "ShowMissingParents",
      type: OptionType.CHECKBOX,
      label: "Indicate missing parents",
      defaultValue: true,
    },
    {
      id: "ShowProfileImage",
      type: OptionType.CHECKBOX,
      label: "Show profile image",
      defaultValue: true,
    },
    {
      id: "RememberDisplayDensity",
      type: OptionType.CHECKBOX,
      label: "Remember display density choice",
    },
    { id: "RememberSearchOptions", type: OptionType.CHECKBOX, label: "Remember search options", defaultValue: false },
    { id: "AddFamilyGroupSheet", type: OptionType.CHECKBOX, label: "Add Family Group buttons", defaultValue: true },
    {
      id: "DistanceAndRelationship",
      type: OptionType.SELECT,
      label: "Add Distance and Relationship columns to",
      values: [
        {
          value: "watchlist",
          text: "Watchlist",
        },
        {
          value: "search",
          text: "Search Results",
        },
        {
          value: "both",
          text: "Watchlist and Search Results",
        },
        {
          value: "none",
          text: "None",
        },
      ],
      defaultValue: "none",
    },
    {
      id: "Suggestions",
      type: OptionType.SELECT,
      label: "Add a Data Doctor suggestions column to",
      values: [
        {
          value: "watchlist",
          text: "Watchlist",
        },
        {
          value: "search",
          text: "Search Results",
        },
        {
          value: "both",
          text: "Watchlist and Search Results",
        },
        {
          value: "none",
          text: "None",
        },
      ],
      defaultValue: "none",
    },
    {
      id: "NotesIntegration",
      type: OptionType.SELECT,
      label: "Enable Profile Notes on",
      values: [
        {
          value: "watchlist",
          text: "Watchlist",
        },
        {
          value: "search",
          text: "Search Results",
        },
        {
          value: "both",
          text: "Watchlist and Search Results",
        },
        {
          value: "none",
          text: "None",
        },
      ],
      defaultValue: "none",
    },
  ],
});
