import { registerFeature, OptionType } from "../../core/options/options_registry";

const myCustomStyle = {
  name: "Custom Style",
  id: "customStyle",
  description: "Choose your own font colors, including visited links, and the style of headings.",
  category: "Global/Style",
  defaultValue: false,
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  pages: [true],
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
          defaultValue: "#ffffff",
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
          label: "Border radius",
          defaultValue: "0",
        },
        {
          id: "headings_box-shadow",
          type: "number",
          label: "Shadow",
          defaultValue: "0",
        },
      ],
    },
    {
      id: "dateHeadings",
      type: OptionType.GROUP,
      label: "Date Headings",
      options: [
        {
          id: "date-headings_background-color",
          type: "color",
          label: "Background color",
          defaultValue: "#8fc641",
        },
        {
          id: "date-headings_color",
          type: "color",
          label: "Text color",
          defaultValue: "#ffffff",
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
          defaultValue: "#e1f0b4",
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
          defaultValue: "#ffe183",
        },
        {
          id: "color4_background-color",
          type: "color",
          label: "Background color 3",
          defaultValue: "#eeeeee",
        },
        {
          id: "link_color",
          type: "color",
          label: "Link color",
          defaultValue: "#006600",
        },
        {
          id: "link2_color",
          type: "color",
          label: "Link color 2",
          defaultValue: "#ffffff",
        },
        {
          id: "scissorsText_color",
          type: "color",
          label: "Scissors text color",
          defaultValue: "#8fc641",
        },
        {
          id: "visitedLink_color",
          type: "color",
          label: "Visited link color",
          defaultValue: "#006600",
        },
      ],
    },
    {
      id: "editorHighlighting",
      type: OptionType.GROUP,
      label: "Enhanced Editor Highlighting",
      options: [
        {
          id: "cmBackgroundColors",
          type: OptionType.GROUP,
          label: "Background Colors",
          options: [
            {
              id: "cm-bracket_background-color",
              type: "color",
              label: "Bracket",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-reference_background-color",
              type: "color",
              label: "Reference",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-tag_background-color",
              type: "color",
              label: "Tag",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-attribute_background-color",
              type: "color",
              label: "Tag attribute (name)",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-heading_background-color",
              type: "color",
              label: "Heading",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-asterisk_background-color",
              type: "color",
              label: "Asterisk",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-category-bracket_background-color",
              type: "color",
              label: "Category bracket",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-category-text_background-color",
              type: "color",
              label: "Category text",
              defaultValue: "#eef5e5",
            },
            {
              id: "cm-template-bracket_background-color",
              type: "color",
              label: "Template bracket",
              defaultValue: "#eef5e5",
            },
            {
              id: "cm-template-name_background-color",
              type: "color",
              label: "Template name",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-template-pipe_background-color",
              type: "color",
              label: "Template pipe",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-template-parameter_background-color",
              type: "color",
              label: "Template parameter",
              defaultValue: "#eeeeee",
            },
            {
              id: "cm-template-parameter-value_background-color",
              type: "color",
              label: "Template parameter value",
              defaultValue: "#fcf5d5",
            },
          ],
        },
      ],
    },
  ],
};

registerFeature(myCustomStyle);
