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
          ],
          defaultValue: "okabeIto",
          comment:
            "The colors below are only used when the palette is set to Custom. " +
            "Link and visited link colors are not set here: see the Visited Links and Custom Style features.",
        },
        {
          id: "newLinkColor",
          type: OptionType.COLOR,
          label: "New/unknown link color",
          defaultValue: "#0072B2",
        },
        {
          id: "dangerColor",
          type: OptionType.COLOR,
          label: "Error color",
          defaultValue: "#B0003A",
        },
        {
          id: "warningColor",
          type: OptionType.COLOR,
          label: "Warning color",
          defaultValue: "#C68900",
        },
        {
          id: "successColor",
          type: OptionType.COLOR,
          label: "Success color",
          defaultValue: "#007A5E",
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
            { value: "none", text: "Color only" },
          ],
          defaultValue: "both",
          comment:
            "WikiTree shows links to categories and pages that do not exist yet in red, and every other link in " +
            "green. These marks make the difference visible without relying on that red/green pair.",
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
            { value: "none", text: "Color only" },
            { value: "underline", text: "An underline" },
            { value: "check", text: "A checkmark after the link" },
          ],
          defaultValue: "none",
          comment:
            "WikiTree shows visited links in purple and unvisited ones in green, which are 23 units apart with " +
            "deuteranopia - close enough that a reader with it reported them as the same link. The mark added " +
            "here does not depend on telling those two colors apart. " +
            "The color of the mark is not set here: it follows whatever your visited link color is, so the " +
            "Visited Links and Custom Style features stay in charge of that and this one only adds the shape. " +
            "The mark goes on content: the rows of a list you are working through, and the links in the text " +
            "you are reading - a profile's biography and sources, its categories box, space and category " +
            "pages, and G2G question lists. The furniture is left alone: navigation bars and menus, the " +
            "profile tab strip, search boxes, badges, and the ancestor tree, which on a well-connected " +
            "profile is 154 links on its own and would swamp everything else. " +
            "The underline is the quieter of the two and costs no space; the checkmark is more obvious but " +
            "sits after the link text whether or not it is showing, and the G2G feature's own visited " +
            "checkmarks go at the front of those same titles, so switching both on puts a mark at each end. " +
            "Where WikiTree already underlines a link - a profile's categories box, the links in a biography - " +
            "the mark sits under the underline that is already there, so a visited one reads as a doubled " +
            "underline. On a title that wraps onto several lines the underline is drawn under each line, " +
            "where the checkmark marks the title once. " +
            "One limit worth knowing: the mark is hidden by painting it the same color as the page, so on a " +
            "link sitting on a colored background a faint mark can show on links you have not visited.",
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
            "Success messages get a solid edge, warnings a dashed one and errors a double one, so the three are " +
            "distinguishable in grayscale. WikiTree's own status boxes give all three the same yellow border and " +
            "change only the background, and those three backgrounds are the same shade of grey once color is " +
            "gone. The same treatment covers suggestion lists and flagged G2G posts, and marks fields you have " +
            "changed in an edit form with a dashed border and a bold label - WikiTree marks those with an orange " +
            "border of the same width and shape as an unchanged one. " +
            "Ordinary green and orange content boxes are left alone: those classes are named after a color, not " +
            "a state, so a page uses them wherever it wants a colored panel and marking them would invent a " +
            "meaning that was never there.",
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
            { value: "none", text: "Color only" },
          ],
          defaultValue: "both",
          comment:
            "Privacy levels 30, 35 and 40 are three near-identical yellows, and share the same padlock icon. " +
            "The number is not added to the smallest dots, which have no room for it; those get a tooltip instead.",
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
            { value: "none", text: "Color only" },
          ],
          defaultValue: "border",
          comment:
            "The pale pink, blue and green backgrounds are hard to tell apart with red-green color blindness. " +
            "To change the colors themselves, use the Profile Background Colors section of the Custom Style feature.",
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
            { value: "none", text: "Color only" },
          ],
          defaultValue: "pattern",
          comment:
            "The Change Family Lists feature draws a colored bar down the right of each person to show two " +
            "things: which spouse each child belongs to, and which parent each sibling shares. It has fifty-one " +
            "colors for the first and nothing else for either, so these are the first things to go without color " +
            "vision, and in grayscale they go completely. This gives the bars themselves a pattern - solid, " +
            "dashed, dotted, double - which needs no color at all and changes nothing about the layout. A number " +
            "can be added as well, and is the clearer of the two, but it has a cost: it needs a strip of space " +
            "beside each row to sit in, which narrows the lists and can push longer names onto a second line. " +
            "Patterns alone are the default for that reason. " +
            "Beside a child it is the spouse they belong with, counting down the list of spouses. Beside a " +
            "sibling it is which parents you share - 1 for the first parent, 2 for the second, and 1,2 for a " +
            "full sibling. Nothing is marked unless it is saying something: a profile with one family, or a " +
            "sibling list where everyone is a full sibling, is left alone. The bar down the left is gender, and " +
            "the Gender Backgrounds section above handles that one.",
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
            "A checking tool: it recolors every page so you can see which distinctions survive. Leave it off for " +
            "normal use. You do not have to start it here - right-click any WikiTree page and choose " +
            "Color-Blind Simulator, which works whether or not the rest of this feature is switched on. Once it " +
            "is running, a control in the corner of the page switches between conditions without coming back " +
            "here, and remembers your choice as you move from page to page. It also has a Support checkbox " +
            "showing whether this feature is helping: change it to compare the page with and without the colors " +
            "and cues, then close the control with the x to keep that change - closing after unticking it " +
            "switches this whole feature off, and closing after ticking it switches it on, the same as the " +
            "checkbox at the top of this section. Choosing Normal ends the simulation, and the control is gone " +
            "on the next page. Achromatopsia shows the page in grayscale, which is also the quickest way to " +
            "check how it would look printed in black and white. While a simulation is on, elements that stay " +
            "fixed on screen (pop-ups, sticky bars) may scroll with the page instead.",
        },
      ],
    },
  ],
};

registerFeature(colorBlindSupport);
