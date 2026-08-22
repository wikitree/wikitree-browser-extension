/*
Created By: Ian Beacall (Beacall-6)
*/

import { isMainDomain, isG2G } from "../../core/pageType";
import { registerFeature, OptionType } from "../../core/options/options_registry";

const colorBlindSupport = {
  name: "Color-Blind Support",
  id: "colorBlindSupport",
  description:
    "Replaces WikiTree's red/green color coding with a color-blind-safe palette, and adds shape and text cues " +
    "so that meaning never depends on color alone. Includes a simulator for checking pages as a color-blind " +
    "reader sees them.",
  category: "Global/Style",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain, isG2G],
  options: [
    {
      id: "palette",
      type: OptionType.GROUP,
      label: "Palette",
      options: [
        {
          id: "paletteName",
          type: OptionType.SELECT,
          label: "Palette",
          values: [
            { value: "okabeIto", text: "Color-blind safe (Okabe-Ito)" },
            { value: "redGreen", text: "Red-green (deuteranopia / protanopia)" },
            { value: "tritan", text: "Blue-yellow (tritanopia)" },
            { value: "highContrast", text: "High contrast" },
            { value: "custom", text: "Custom (use the colors below)" },
            { value: "none", text: "Do nothing (keep WikiTree's colors)" },
          ],
          defaultValue: "okabeIto",
          comment:
            "Recolors the success, warning and error message boxes, the small badges and new/unknown links. " +
            'Every other cue is a shape, so it stays whichever palette you choose, including "Do nothing".',
        },
        {
          // Only true while the pickers below it are on the page, so it comes and goes with
          // them rather than describing controls that are not there.
          type: OptionType.TEXT_LINE,
          dependsOn: { option: "paletteName", value: "custom", hide: true },
          comment: "The three colors below are the message boxes themselves.",
        },
        {
          id: "dangerColor",
          type: OptionType.COLOR,
          label: "Error color",
          // WikiTree's own error box, so switching to Custom starts from the page as it is
          // rather than from an accent that would paint the box a solid dark block.
          defaultValue: "#FFCCCC",
          dependsOn: { option: "paletteName", value: "custom", hide: true },
          comment:
            "Fills the error message box and the red badges, exactly as picked. Red text in Date Fixer, " +
            "Text Expander, Locations Helper and WikiTree+ uses a darkened version so it stays readable.",
        },
        {
          id: "warningColor",
          type: OptionType.COLOR,
          label: "Warning color",
          defaultValue: "#FFEE99",
          dependsOn: { option: "paletteName", value: "custom", hide: true },
          comment: "Fills the warning message box, exactly as picked.",
        },
        {
          id: "successColor",
          type: OptionType.COLOR,
          label: "Success color",
          defaultValue: "#E1F0B4",
          dependsOn: { option: "paletteName", value: "custom", hide: true },
          comment: "Fills the success message box and the green badges, exactly as picked.",
        },
      ],
    },
    {
      id: "links",
      type: OptionType.GROUP,
      label: "New/Unknown Links",
      options: [
        {
          id: "newLinkCue",
          type: OptionType.SELECT,
          label: "Mark links to pages that do not exist yet",
          values: [
            { value: "both", text: "Dotted underline and a ?" },
            { value: "dotted", text: "Dotted underline" },
            { value: "question", text: "A ? after the link" },
            { value: "none", text: "Do not mark them" },
          ],
          defaultValue: "both",
          comment:
            "WikiTree colors these red and every other link green - the same link with red-green color " +
            "blindness. The mark shows the difference without the color. Pick the ? if you would rather have " +
            "no underlines.",
        },
        {
          id: "newLinkRecolor",
          type: OptionType.CHECKBOX,
          label: "Recolor new/unknown links",
          defaultValue: true,
          comment:
            "Replaces WikiTree's red with the palette color. Turn it off to keep WikiTree's own color, or your " +
            "Custom Style one, and rely on the mark alone.",
        },
        {
          id: "newLinkColor",
          type: OptionType.COLOR,
          label: "New/unknown link color",
          defaultValue: "#0072B2",
          dependsOn: { option: "paletteName", value: "custom", hide: true },
          comment: "Paints the link text, and the same links in Category Display, when the box " + "above is ticked.",
        },
      ],
    },
    {
      id: "badges",
      type: OptionType.GROUP,
      label: "Badges",
      options: [
        {
          id: "badgeCue",
          type: OptionType.SELECT,
          label: "Mark the small green and red badges",
          values: [
            { value: "both", text: "Recolored fill and a border" },
            { value: "recolor", text: "Recolored fill" },
            { value: "border", text: "Border" },
            { value: "none", text: "Leave them alone" },
          ],
          defaultValue: "both",
          comment:
            "Badges are too small for much of a shape, so the fill does most of the work. The border - solid " +
            "for green, dashed for red - is the part that survives grayscale.",
        },
      ],
    },
    {
      id: "visited",
      type: OptionType.GROUP,
      label: "Visited Links",
      options: [
        {
          id: "visitedCue",
          type: OptionType.SELECT,
          label: "Mark links you have already visited",
          values: [
            { value: "none", text: "Do not mark them" },
            { value: "underline", text: "An underline" },
            { value: "check", text: "A checkmark after the link" },
          ],
          defaultValue: "none",
          comment:
            "Visited purple and unvisited green are 23 units apart with deuteranopia - near enough the same " +
            "link. The mark shows the difference without the color, and takes whatever visited link color you " +
            "have set elsewhere. " +
            "It marks content only: list rows, and links in the text you are reading. Menus, tabs and the " +
            "ancestor tree are left alone. The underline costs no space; the checkmark leaves a small gap " +
            "after every link, showing or not.",
        },
      ],
    },
    {
      id: "boxes",
      type: OptionType.GROUP,
      label: "Status, Suggestions and Edited Fields",
      options: [
        {
          id: "statusCue",
          type: OptionType.CHECKBOX,
          label: "Give each kind of message a distinct border",
          defaultValue: true,
          comment:
            "WikiTree gives success, warning and error boxes the same border and changes only the background, " +
            "and those three backgrounds are one shade of grey without color. Solid, dashed and double edges " +
            "tell them apart. Also covers suggestion lists, flagged G2G posts, and fields you have changed in " +
            "an edit form.",
        },
      ],
    },
    {
      id: "privacy",
      type: OptionType.GROUP,
      label: "Privacy Indicators",
      options: [
        {
          id: "privacyCue",
          type: OptionType.SELECT,
          label: "Mark privacy levels",
          values: [
            { value: "both", text: "Border style and the level number" },
            { value: "border", text: "Border style" },
            { value: "number", text: "The level number" },
            { value: "none", text: "Do not mark them" },
          ],
          defaultValue: "both",
          comment:
            "Levels 30, 35 and 40 are three near-identical yellows sharing one padlock icon. The smallest dots " +
            "have no room for a number, so they get a tooltip instead.",
        },
      ],
    },
    {
      id: "gender",
      type: OptionType.GROUP,
      label: "Gender Backgrounds",
      options: [
        {
          id: "genderCue",
          type: OptionType.SELECT,
          label: "Mark gender backgrounds",
          values: [
            { value: "border", text: "Border style" },
            { value: "letter", text: "Border style and a letter" },
            { value: "none", text: "Do not mark them" },
          ],
          defaultValue: "border",
          comment:
            "The pale pink, blue and green backgrounds are hard to tell apart with red-green color blindness. " +
            "To change the colors, see Custom Style.",
        },
      ],
    },
    {
      id: "family",
      type: OptionType.GROUP,
      label: "Family Connections",
      options: [
        {
          id: "familyCue",
          type: OptionType.SELECT,
          label: "Number the family connections in family lists",
          values: [
            { value: "pattern", text: "Patterned bars" },
            { value: "both", text: "Patterned bars and a number" },
            { value: "number", text: "A number" },
            { value: "none", text: "Do not mark them" },
          ],
          defaultValue: "pattern",
          comment:
            "Change Family Lists uses fifty-one bar colors to show which spouse each child belongs to and " +
            "which parent each sibling shares - all of it lost in grayscale. Patterned bars cost no space. A " +
            "number is clearer but needs a strip beside each row, which can wrap longer names. " +
            "Beside a child the number is the spouse; beside a sibling it is which parents you share, so 1,2 " +
            "is a full sibling. Nothing is marked where there is only one family to tell apart.",
        },
      ],
    },
    {
      id: "simulator",
      type: OptionType.GROUP,
      label: "Simulator",
      options: [
        {
          id: "simulate",
          type: OptionType.SELECT,
          label: "Show every page as",
          values: [
            { value: "off", text: "Normal (off)" },
            { value: "achromatopsia", text: "Achromatopsia (no color at all)" },
            { value: "deuteranopia", text: "Deuteranopia (no green)" },
            { value: "protanopia", text: "Protanopia (no red)" },
            { value: "tritanopia", text: "Tritanopia (no blue)" },
          ],
          defaultValue: "off",
          comment:
            "A checking tool: it recolors every page so you can see which distinctions survive. Leave it off " +
            "for normal use. You can also start it by right-clicking any page, and a control in the corner " +
            "then switches conditions and compares the page with and without this feature's help. " +
            "Achromatopsia is grayscale, which is the most reliable check and doubles as a print preview. " +
            "While a simulation is on, fixed pop-ups and sticky bars may scroll with the page.",
        },
      ],
    },
  ],
};

registerFeature(colorBlindSupport);
