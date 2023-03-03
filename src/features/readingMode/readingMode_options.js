import { registerFeature, OptionType } from "../../core/options/options_registry";

const readingModeFeature = {
  name: "Reading Mode",
  id: "readingMode",
  description: "Toggle the WikiTree interface on/off for readability while browsing profiles.",
  category: "Style",
  defaultValue: false,
  options: [
    {
      id: "hideSideBar",
      type: OptionType.CHECKBOX,
      label: "Hide the right-hand column with DNA connections, images, etc.",
      defaultValue: true,
    },
    {
      id: "hideInlineTables",
      type: OptionType.CHECKBOX,
      label: "Hide all tables in the bio.",
      defaultValue: true,
    },
    {
      id: "hideSources",
      type: OptionType.CHECKBOX,
      label: "Hide the Sources section and all inline references.",
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
      id: "hideInlineImages",
      type: OptionType.CHECKBOX,
      label: "Hide inline images and captions in the bio.",
      defaultValue: true,
    },
    {
      id: "hideComments",
      type: OptionType.CHECKBOX,
      label: "Hide comments, memories, and merges.",
      defaultValue: true,
    },
    {
      id: "hideHeadingExtras",
      type: OptionType.CHECKBOX,
      label: "Hide extra widgets (copy) and icons (privacy) in the profile heading.",
      defaultValue: true,
    },
    {
      id: "hideEdits",
      type: OptionType.CHECKBOX,
      label: "Hide edit links on the vitals and in the bio.",
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
  ],
};

registerFeature(readingModeFeature);
