/*
Created By: Jonathan Duke (Duke-5773)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage, isProfilePage, isSpacePage } from "../../core/pageType";

const readingModeFeature = {
  name: "Reading Mode",
  id: "readingMode",
  description: "Toggle the WikiTree interface on/off for readability while browsing profiles.",
  category: "Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage, isSpacePage, isCategoryPage],

  options: [
    {
      id: "hideSideBar",
      type: OptionType.CHECKBOX,
      label: "Hide the right-hand column with DNA connections, images, etc.",
      defaultValue: true,
    },
    {
      id: "hideHeadingExtras",
      type: OptionType.CHECKBOX,
      label: "Hide extra widgets (copy) and icons (privacy) in the profile heading.",
      defaultValue: true,
    },
    {
      id: "hidePageTabs",
      type: OptionType.CHECKBOX,
      label: "Hide the tabs at the top of the profile.",
      defaultValue: true,
    },
    {
      id: "hideViewTabs",
      type: OptionType.CHECKBOX,
      label: "Hide the navigation buttons under the tabs section.",
      defaultValue: true,
    },
    {
      id: "hideAuditData",
      type: OptionType.CHECKBOX,
      label: "Hide the profile manager, last modified/accessed, etc.",
      defaultValue: true,
    },
    {
      id: "hideEdits",
      type: OptionType.CHECKBOX,
      label: "Hide edit links on the vitals and in the bio.",
      defaultValue: true,
    },
    {
      id: "hideInlineTables",
      type: OptionType.CHECKBOX,
      label: "Hide all tables in the bio.",
      defaultValue: false,
    },
    {
      id: "hideInlineImages",
      type: OptionType.CHECKBOX,
      label: "Hide inline images and captions in the bio.",
      defaultValue: false,
    },
    {
      id: "hideCitations",
      type: OptionType.CHECKBOX,
      label: "Hide citation superscripts within the biography.",
      defaultValue: false,
    },
    {
      id: "collapseSources",
      type: OptionType.CHECKBOX,
      label: "Collapse the entire Sources section (the header can still be expanded).",
      defaultValue: true,
    },
    {
      id: "hideComments",
      type: OptionType.CHECKBOX,
      label: "Hide comments, memories, and merges.",
      defaultValue: true,
    },
    {
      id: "hideConnections",
      type: OptionType.CHECKBOX,
      label: "Hide connections to famous people at the bottom.",
      defaultValue: true,
    },
    {
      id: "hideCategories",
      type: OptionType.CHECKBOX,
      label: "Hide categories.",
      defaultValue: true,
    },
    {
      id: "hideBackground",
      type: OptionType.CHECKBOX,
      label: "Hide custom background images.",
      defaultValue: false,
    },
  ],
};

registerFeature(readingModeFeature);
