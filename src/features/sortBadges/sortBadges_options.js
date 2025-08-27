import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isProfileLoggedInUserPage, isSpecialBadges } from "../../core/pageType";

registerFeature({
  name: "Sort Badges",
  id: "sortBadges",
  description: "Buttons to hide or move badges down on your badge management page.",
  category: "Community",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileLoggedInUserPage, isSpecialBadges],
  options: [
    {
      id: "hideGroup",
      type: OptionType.GROUP,
      label: "Hide",
      options: [
        {
          id: "hideClubBadges",
          type: OptionType.CHECKBOX,
          label: "Club 100/1000 badges",
          defaultValue: true,
        },
        {
          id: "hideG2GBadges",
          type: OptionType.CHECKBOX,
          label: "G2G badges",
          defaultValue: false,
        },
        {
          id: "hideTreeDaysBadges",
          type: OptionType.CHECKBOX,
          label: "Tree Days badges",
          defaultValue: false,
        },
        {
          id: "hideHacktoberfestBadges",
          type: OptionType.CHECKBOX,
          label: "Hacktoberfest badges",
          defaultValue: false,
        },
        {
          id: "hideGedcomBadges",
          type: OptionType.CHECKBOX,
          label: "GEDCOM Equipped badges",
          defaultValue: false,
        },
        {
          id: "hideConnectathonBadges",
          type: OptionType.CHECKBOX,
          label: "Connect-a-Thon badges",
          defaultValue: false,
        },
        {
          id: "hideGenerousBadges",
          type: OptionType.CHECKBOX,
          label: "Generous Genealogist badges",
          defaultValue: false,
        },
      ],
    },
    {
      id: "moveGroup",
      type: OptionType.GROUP,
      label: "Move Down",
      options: [
        {
          id: "moveClubBadges",
          type: OptionType.CHECKBOX,
          label: "Club 100/1000 badges",
          defaultValue: true,
        },
        {
          id: "moveG2GBadges",
          type: OptionType.CHECKBOX,
          label: "G2G badges",
          defaultValue: false,
        },
        {
          id: "moveTreeDaysBadges",
          type: OptionType.CHECKBOX,
          label: "Tree Days badges",
          defaultValue: false,
        },
        {
          id: "moveHacktoberfestBadges",
          type: OptionType.CHECKBOX,
          label: "Hacktoberfest badges",
          defaultValue: false,
        },
        {
          id: "moveGedcomBadges",
          type: OptionType.CHECKBOX,
          label: "GEDCOM Equipped badges",
          defaultValue: false,
        },
        {
          id: "moveConnectathonBadges",
          type: OptionType.CHECKBOX,
          label: "Connect-a-Thon badges",
          defaultValue: false,
        },
        {
          id: "moveGenerousBadges",
          type: OptionType.CHECKBOX,
          label: "Generous Genealogist badges",
          defaultValue: false,
        },
      ],
    },
  ],
});
