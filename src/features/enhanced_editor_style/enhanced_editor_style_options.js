import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";
registerFeature({
  name: "Enhanced Editor Style",
  id: "enhancedEditorStyle",
  description: "Choose your own colors for Enhanced Editor highlighting.",
  category: "Editing",
  defaultValue: false,
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  pages: [isMainDomain],
  options: [
    {
      id: "cmBackgroundColors",
      type: OptionType.GROUP,
      label: "Background Colors",
      options: [
        {
          id: "cm-reference-tag-bg_background-color",
          type: "color",
          label: "Reference tag",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-reference-text-bg_background-color",
          type: "color",
          label: "Reference text",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-heading-bg_background-color",
          type: "color",
          label: "Heading",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-asterisk-bg_background-color",
          type: "color",
          label: "Asterisk",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-category-bracket-bg_background-color",
          type: "color",
          label: "Category/Wikilink bracket",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-category-text-bg_background-color",
          type: "color",
          label: "Category/Wikilink text",
          defaultValue: "#eef5e5",
        },
        {
          id: "cm-template-bracket-bg_background-color",
          type: "color",
          label: "Template bracket",
          defaultValue: "#eef5e5",
        },
        {
          id: "cm-template-name-bg_background-color",
          type: "color",
          label: "Template name",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-template-pipe-bg_background-color",
          type: "color",
          label: "Template pipe",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-template-parameter-bg_background-color",
          type: "color",
          label: "Template parameter",
          defaultValue: "#eeeeee",
        },
        {
          id: "cm-template-parameter-value-bg_background-color",
          type: "color",
          label: "Template parameter value",
          defaultValue: "#fcf5d5",
        },
      ],
    },
    {
      id: "cmTextColors",
      type: OptionType.GROUP,
      label: "Text Color",
      options: [
        {
          id: "cm-regular-text_color",
          type: "color",
          label: "Regular text",
          defaultValue: "#000000",
        },
        {
          id: "cm-heading-text_color",
          type: "color",
          label: "Headings",
          defaultValue: "#000000",
        },
        {
          id: "cm-reference-text_color",
          type: "color",
          label: "References",
          defaultValue: "#000000",
        },
      ],
    },

    {
      id: "cmFontColors",
      type: OptionType.GROUP,
      label: "Font",
      options: [
        {
          id: "cm-bio-text-font_font-family",
          type: OptionType.SELECT,
          label: "Biography text",
          defaultValue: "inherit",
          values: [
            { value: "inherit", text: "Default" },
            { value: "monospace", text: "Monospace" },
            { value: "Courier new", text: "Courier new" },
            { value: "sans-serif", text: "Sans-serif" },
            { value: "serif", text: "Serif" },
          ],
        },
        {
          id: "cm-reference-text-font_font-family",
          type: OptionType.SELECT,
          label: "References",
          defaultValue: "inherit",
          values: [
            { value: "inherit", text: "Default" },
            { value: "monospace", text: "Monospace" },
            { value: "Courier new", text: "Courier new" },
            { value: "sans-serif", text: "Sans-serif" },
            { value: "serif", text: "Serif" },
          ],
        },
        {
          id: "cm-value-font_font-family",
          type: OptionType.SELECT,
          label: "Template / Category values",
          defaultValue: "inherit",
          values: [
            { value: "inherit", text: "Default" },
            { value: "monospace", text: "Monospace" },
            { value: "Courier new", text: "Courier new" },
            { value: "sans-serif", text: "Sans-serif" },
            { value: "serif", text: "Serif" },
          ],
        },
      ],
    },
  ],
});
