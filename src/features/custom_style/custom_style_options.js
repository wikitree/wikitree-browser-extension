import { registerFeature, OptionType } from "../../core/options/options_registry";

// The feature data for the myFeature feature
const myCustomStyle = {
  name: "Custom Style",
  id: "customStyle",
  description: "Add your own style rules to WikiTree.",
  category: "Style",
  defaultValue: true,
  options: [
    {
      id: "headings",
      type: OptionType.GROUP,
      label: "Headings",
      options: [
        {
          id: "headings_background-color",
          type: "color",
          label: "Background color",
          defaultValue: "#E1F0B4",
        },
        {
          id: "headings_color",
          type: "color",
          label: "Text color",
          defaultValue: "#000000",
        },
        {
          id: "headings_padding",
          type: "number",
          label: "Padding",
          defaultValue: "0",
        },
        {
          id: "headings_border-radius",
          type: "number",
          label: "Border-radius",
          defaultValue: "0",
        },
      ],
    },
    {
      id: "standardColors",
      type: OptionType.GROUP,
      label: "Standard Colors",
      options: [
        {
          id: "color1_background-color",
          type: "color",
          label: "Background color 1",
          defaultValue: "#E1F0B4",
        },
        {
          id: "color2_background-color",
          type: "color",
          label: "Background color 2",
          defaultValue: "#ffe270",
        },
        {
          id: "color3_background-color",
          type: "color",
          label: "Background color 3",
          defaultValue: "#253b2f",
        },
        {
          id: "link_color",
          type: "color",
          label: "Link color",
          defaultValue: "#060",
        },
        {
          id: "link2_color",
          type: "color",
          label: "Link color 2",
          defaultValue: "#fff",
        },
      ],
    },
    {
      id: "hideSections",
      type: OptionType.GROUP,
      label: "Hide Sections",
      options: [
        {
          id: "hide_DNA",
          type: OptionType.CHECKBOX,
          label: "DNA",
          defaultValue: false,
        },
        {
          id: "hide_images",
          type: OptionType.CHECKBOX,
          label: "Images",
          defaultValue: false,
        },
        {
          id: "hide_Collaboration",
          type: OptionType.CHECKBOX,
          label: "Collaboration",
          defaultValue: false,
        },
        {
          id: "hide_Research",
          type: OptionType.CHECKBOX,
          label: "Research",
          defaultValue: false,
        },
        {
          id: "hide_Matches",
          type: OptionType.CHECKBOX,
          label: "Matches and Merges",
          defaultValue: false,
        },
        {
          id: "hide_footer",
          type: OptionType.CHECKBOX,
          label: "Footer",
          defaultValue: false,
        },
        {
          id: "hide_comments",
          type: OptionType.CHECKBOX,
          label: "Comments",
          defaultValue: false,
        },
      ],
    },
  ],
};

// qa-q-item-tag-item

// Just importing this file will register all the features
registerFeature(myCustomStyle);
