import { isMainDomain } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const myCustomStyle = {
  name: "Custom Style",
  id: "customStyle",
  description: "Choose your own font colors, including visited links, and the style of headings.",
  category: "Global/Style",
  defaultValue: false,
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  pages: [isMainDomain],
  options: [
    {
      id: "general",
      type: OptionType.GROUP,
      label: "Global",
      options: [
        {
          id: "roundedCorners",
          type: OptionType.CHECKBOX,
          label: "Rounded corners",
          defaultValue: false,
        },
        {
          id: "header_background-color",
          type: "color",
          label: "Header background color",
          defaultValue: "#f7f6f0",
        },
        {
          id: "editor_font-size",
          type: OptionType.SELECT,
          label: "Editor font size",
          values: [
            { value: "100", text: "100%" },
            { value: "110", text: "110%" },
            { value: "120", text: "120%" },
            { value: "130", text: "130%" },
            { value: "140", text: "140%" },
            { value: "150", text: "150%" },
            { value: "160", text: "160%" },
            { value: "170", text: "170%" },
            { value: "180", text: "180%" },
            { value: "190", text: "190%" },
            { value: "200", text: "200%" },
            { value: "210", text: "210%" },
            { value: "220", text: "220%" },
            { value: "230", text: "230%" },
            { value: "240", text: "240%" },
            { value: "250", text: "250%" },
          ],
          defaultValue: "100",
        },
      ],
    },
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
      id: "standardColors",
      type: OptionType.GROUP,
      label: "Profile Background Colors",
      options: [
        {
          id: "color1_background-color",
          type: "color",
          label: "Background color 1 (Profile tabs, etc.)",
          defaultValue: "#e1f0b4",
        },
        {
          id: "color2_background-color",
          type: "color",
          label: "Background color 2 (Current profile tab, etc.)",
          defaultValue: "#ffe270",
        },
        {
          id: "color3_background-color",
          type: "color",
          label: "Background color 3 (Profile manager)",
          defaultValue: "#ffe183",
        },
        {
          id: "color4_background-color",
          type: "color",
          label: "Background color 4 ('This page has been accessed...')",
          defaultValue: "#eeeeee",
        },
      ],
    },
    {
      id: "linkColors",
      type: OptionType.GROUP,
      label: "Profile Link Colors",
      options: [
        {
          id: "link_color",
          type: "color",
          label: "Link color",
          defaultValue: "#006600",
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
      id: "dateHeadings",
      type: OptionType.GROUP,
      label: "Activity Feed Date Headings",
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
      id: "g2gColors",
      type: OptionType.GROUP,
      label: "G2G",
      options: [
        {
          id: "tag_color",
          type: "color",
          label: "Tag text color",
          defaultValue: "#ffffff",
        },
        {
          id: "tag_background-color",
          type: "color",
          label: "Tag background color",
          defaultValue: "#8fc741",
        },
        {
          id: "tagHover_color",
          type: "color",
          label: "Tag hover text color",
          defaultValue: "#000000",
        },
        {
          id: "tagHover_background-color",
          type: "color",
          label: "Tag hover background color",
          defaultValue: "#ffffa0",
        },
        {
          id: "g2gtab_background-color",
          type: "color",
          label: "Tabs and Voting box background color",
          defaultValue: "#b5d775",
        },
        {
          id: "g2gtab_color",
          type: "color",
          label: "Tabs and Voting box text color",
          defaultValue: "#ffffff",
        },
        {
          id: "g2gtabHover_background-color",
          type: "color",
          label: "Tabs hover background color",
          defaultValue: "#ffffa0",
        },
        {
          id: "g2gtabHover_color",
          type: "color",
          label: "Tabs hover text color",
          defaultValue: "#000000",
        },
        {
          id: "g2gtabSelected_background-color",
          type: "color",
          label: "Current tab background color",
          defaultValue: "#253b2f",
        },
        {
          id: "g2gtabSelected_color",
          type: "color",
          label: "Current tab text color",
          defaultValue: "#ffffff",
        },
        {
          id: "count_background-color",
          type: "color",
          label: "Count box background color",
          defaultValue: "#fccd7d",
        },
      ],
    },
  ],
};

registerFeature(myCustomStyle);
