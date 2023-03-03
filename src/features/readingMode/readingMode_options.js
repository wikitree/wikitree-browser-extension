import { registerFeature, OptionType } from "../../core/options/options_registry";

const readingModeFeature = {
  name: "Reading Mode",
  id: "readingMode",
  description: "Toggle the WikiTree interface on/off to easily browse profiles.",
  category: "Style",
  defaultValue: false,
  options: [
    // The right hand column. This would hide the "six columns" div and expand the left column t be the full 16 columns.
    // All tables in the bio
    // The Sources section and all inline ref links (e.g. [1])
    // The 3 lines that name the profile manager and last edited etc.
    // Possibly the tabs (Edit, Images etc)
    // All inline images in the bio along with their captions
    // The memories, comments and matches/merges sections
    // The line of buttons under the tabs ([Comments ][Family Group][Matches ][Sources])
    {
      id: "hideSideBar",
      type: OptionType.CHECKBOX,
      label: "Hide the right-hand column with DNA connections, images, etc.",
      defaultValue: true,
    },
    {
      id: "hideTables",
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
      id: "hideTabs",
      type: OptionType.CHECKBOX,
      label: "Hide the tabs at the top of the profile.",
      defaultValue: true,
    },
    {
      id: "hideButtons",
      type: OptionType.CHECKBOX,
      label: "Hide the navigation buttons under the tabs section.",
      defaultValue: true,
    },
    {
      id: "hideProfileStatus",
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
      id: "hideHeaderExtras",
      type: OptionType.CHECKBOX,
      label: "Hide extra options (copy) and icons (privacy) in the profile header.",
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
