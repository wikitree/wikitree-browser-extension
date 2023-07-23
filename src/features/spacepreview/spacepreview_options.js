/*
 * Created By: Steve Harris (Harris-5439)
 * Contributor: Jonathan Duke (Duke-5773)
 */
import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const pagePreviewFeature = {
  name: "Preview Pages",
  id: "spacePreviews", // keep ID the same to preserve configuration
  description: "Enable page previews when hovering over certain WikiTree links.",
  category: "Navigation",
  creators: [{ name: "Steve Harris", wikitreeid: "Harris-5439" }],
  contributors: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  defaultValue: false,
  pages: [isMainDomain],

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
        {
          id: "otherPagePreview",
          type: OptionType.CHECKBOX,
          label: "Enable previews on special page links (Help, Projects, etc.)",
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
          label: "Show header information (date, location, tags/surnames)",
          defaultValue: true,
        },
        {
          id: "showAudit",
          type: OptionType.CHECKBOX,
          label: "Show page manager, times accessed, etc.",
          defaultValue: false,
        },
        {
          id: "showLinks",
          type: OptionType.CHECKBOX,
          label: 'Show "Categories:" and "Other:" links at the top',
          defaultValue: true,
        },
        {
          id: "showEdit",
          type: OptionType.CHECKBOX,
          label: "Show edit links",
          defaultValue: false,
        },
        {
          id: "tocDisplay",
          type: OptionType.SELECT,
          label: "The table of contents should be",
          values: [
            {
              value: 0,
              text: "hidden",
            },
            {
              value: 1,
              text: "collapsed",
            },
            {
              value: 3,
              text: "expanded",
            },
          ],
          defaultValue: 0,
        },
      ],
    },
  ],
};

registerFeature(pagePreviewFeature);
