/*
 * Created By: Steve Harris (Harris-5439)
 * Contributor: Jonathan Duke (Duke-5773)
 */

import { registerFeature, OptionType } from "../../core/options/options_registry";

const pagePreviewFeature = {
  name: "Page Previews",
  id: "spacePreviews", // keep ID the same to preserve configuration
  description: "Enable page previews when hovering over certain WikiTree links.",
  category: "Global",
  creators: [{ name: "Steve Harris", wikitreeid: "Harris-5439" }],
  contributors: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  defaultValue: false,
  pages: [true],

  options: [
    {
      id: "pageSelectionGroup",
      type: OptionType.GROUP,
      label: "Page Selection",
      options: [
        {
          id: "spacePagePreview",
          type: OptionType.CHECKBOX,
          label: "Enable previews on free-space page links",
          defaultValue: true,
        },
        {
          id: "categoryPagePreview",
          type: OptionType.CHECKBOX,
          label: "Enable previews on category page links",
          defaultValue: false,
        },
      ],
    },
    {
      id: "displayOptionsGroup",
      type: OptionType.GROUP,
      label: "Display Options",
      options: [
        {
          id: "showTitle",
          type: OptionType.CHECKBOX,
          label: "Show the page title at the top",
          defaultValue: true,
        },
        {
          id: "showScissors",
          type: OptionType.CHECKBOX,
          label: "Show scissors beside the title to copy the ID or link",
          defaultValue: true,
        },
        {
          id: "showHeader",
          type: OptionType.CHECKBOX,
          label: "Show header (tags, categories, etc.)",
          defaultValue: true,
        },
        {
          id: "showAudit",
          type: OptionType.CHECKBOX,
          label: "Show page manager, times accessed, etc.",
          defaultValue: false,
        },
        {
          id: "showEdit",
          type: OptionType.CHECKBOX,
          label: "Show edit links",
          defaultValue: false,
        },
        {
          id: "showToc",
          type: OptionType.CHECKBOX,
          label: "Show table of contents",
          defaultValue: false,
        },
      ],
    },
  ],
};

registerFeature(pagePreviewFeature);
