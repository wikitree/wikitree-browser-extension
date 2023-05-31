/*
 * Created By: Jonathan Duke (Duke-5773)
 * Original Features:
 *   Accessibility Options (Duke-5773)
 *   Reading Mode (Duke-5773)
 *   Collapsible Sources (Beacall-6)
 *   Format Source Reference Numbers (Beacall-6)
 */

import { registerFeature, OptionType } from "../../core/options/options_registry";
import { isCategoryPage, isProfilePage, isSpacePage } from "../../core/pageType";

(async function (store) {
  // import settings from merged features if readability has never been loaded before
  if (store) {
    await store.get("readability").then(async (result) => {
      if (!result || result.readability === undefined) {
        await Promise.all([
          store.get("accessibility"),
          store.get("accessibility_options"),
          store.get("readingMode"),
          store.get("readingMode_options"),
          store.get("readingMode_toggle"),
          store.get("collapsibleSources"),
          store.get("formatSourceReferenceNumbers"),
          store.get("formatSourceReferenceNumbers_options"),
        ]).then(async (values) => {
          console.log("options from merged features imported: " + JSON.stringify(values));
          if (
            !!values[0].accessibility ||
            !!values[2].readingMode ||
            !!values[5].collapsibleSources ||
            !!values[6].formatSourceReferenceNumbers
          ) {
            let settings = {
              readability: true,
              readability_options: {
                ...values[1].accessibility_options,
                ...values[3].readingMode_options,
                ...values[4],
                ...values[7].formatSourceReferenceNumbers_options,
              },
            };
            let options = settings.readability_options;
            if (options.listItemSpacing === "0") {
              options.listItemSpacing = "default"; // the old "none" was like the new "default" but the new one removes all spacing
            }
            options.readingMode = !!values[2].readingMode;
            options.hideCitations = options.mode === "hide" ? "255" : options.hideCitations ? "1" : "0";
            if (!!values[6].formatSourceReferenceNumbers) {
              options.citationSize = "80";
              if (options.mode !== "hide") options.citationFormat = "2";
            }
            options.mode = null; // no longer used
            options.citationFormat = options.citationFormat
              ? options.citationFormat
              : options.cleanCitations
              ? "3"
              : "0";
            options.sortCitations = !!options.cleanCitations;
            options.cleanCitations = options.citationFormat !== "0"; // clean now only means removing whitespace and underlines
            options.collapseSources = !!values[5].collapsibleSources ? "255" : options.collapseSources ? "1" : "0";
            options.boldSources = options.boldSources ? "255" : "0";
            options.removeSourceBreaks = options.removeSourceBreaks ? "255" : "0";
            options.removeSourceLabels = options.removeSourceLabels ? "255" : "0";
            options.removeBackReferences = options.removeBackReferences ? "1" : "0";
            options.hideSidebar = options.hideSideBar ? "1" : "0";
            options.hideHeadingExtras = options.hideHeadingExtras ? "1" : "0";
            options.hidePageTabs = options.hidePageTabs ? "1" : "0";
            options.hideViewTabs = options.hideViewTabs ? "1" : "0";
            options.hideAuditData = options.hideAuditData ? "1" : "0";
            options.hideEdits = options.hideEdits ? "1" : "0";
            options.hideStatus = options.hideStatus ? "1" : "0";
            options.hideStickers = options.hideStickers ? "1" : "0";
            options.hideTableOfContents = options.hideTableOfContents ? "1" : "0";
            options.hideInlineTables = options.hideInlineTables ? "1" : "0";
            options.hideInlineImages = options.hideInlineImages ? "1" : "0";
            options.hideComments = options.hideComments ? "1" : "0";
            options.hideConnections = options.hideConnections ? "1" : "0";
            options.hideCategories = options.hideCategories ? "1" : "0";
            options.hideBackground = options.hideBackground ? "1" : "0";
            await store.set(settings);
          }
        });
      }
    });
  }
})((typeof browser !== "undefined" ? browser : chrome).storage.sync);

const readabilityFeature = {
  name: "Readability Options",
  id: "readability",
  description:
    "Enable reading mode to toggle the WikiTree interface on and off when browsing profiles. Configure additional styling options to make profiles more readable.",
  helpLink: "https://www.wikitree.com/wiki/Space:WikiTree_Readability_Options#Options",
  category: "Global/Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  defaultValue: false,
  pages: [isProfilePage, isSpacePage, isCategoryPage],

  options: [
    {
      id: "readingModeGroup",
      type: OptionType.GROUP,
      label: "Reading Mode",
      options: [
        {
          id: "readingMode_toggle",
          type: OptionType.CHECKBOX,
          label: "Enable reading mode",
          defaultValue: false,
        },
        {
          id: "readingMode",
          type: OptionType.CHECKBOX,
          label: "Show the reading mode toggle switch",
          defaultValue: true,
        },
      ],
    },
    {
      type: OptionType.GROUP,
      label: "List Spacing",
      options: [
        {
          id: "listItemSpacing",
          type: OptionType.SELECT,
          label: "Adjust spacing between list items",
          values: [
            {
              value: 0,
              text: "none",
            },
            {
              value: "default",
              text: "WikiTree default",
            },
            {
              value: 50,
              text: "50% (half)",
            },
            {
              value: 75,
              text: "75%",
            },
            {
              value: 100,
              text: "100% (single)",
            },
            {
              value: 150,
              text: "150%",
            },
            {
              value: 200,
              text: "200% (double)",
            },
            {
              value: 300,
              text: "300%",
            },
            {
              value: 400,
              text: "400% (extra wide)",
            },
          ],
          defaultValue: "default",
        },
        {
          id: "mergeAdjacentLists",
          type: OptionType.CHECKBOX,
          label: "Remove blank lines between bullet list items",
          defaultValue: false,
        },
        {
          id: "spaceSourceItemsOnly",
          type: OptionType.CHECKBOX,
          label: "Apply spacing rules only to the Sources section",
          defaultValue: true,
        },
      ],
    },
    {
      type: OptionType.GROUP,
      label: "Sources Section",
      options: [
        {
          id: "collapseSources",
          type: OptionType.SELECT,
          label: "Collapse the entire Sources section",
          values: [
            {
              value: 0,
              text: "never",
            },
            {
              value: 1,
              text: "in reading mode",
            },
            {
              value: 254,
              text: "only on demand",
            },
            {
              value: 255,
              text: "always",
            },
          ],
          defaultValue: 1,
        },
        {
          id: "boldSources",
          type: OptionType.SELECT,
          label: "Bold the first segment of each source",
          values: [
            {
              value: 0,
              text: "never",
            },
            {
              value: 1,
              text: "in reading mode",
            },
            {
              value: 255,
              text: "always",
            },
          ],
          defaultValue: 0,
        },
        {
          id: "removeSourceLabels",
          type: OptionType.SELECT,
          label: "Remove bold labels and asterisks from the beginning of sources",
          values: [
            {
              value: 0,
              text: "never",
            },
            {
              value: 1,
              text: "in reading mode",
            },
            {
              value: 255,
              text: "always",
            },
          ],
          defaultValue: 0,
        },
        {
          id: "removeSourceBreaks",
          type: OptionType.SELECT,
          label: "Remove explicit line breaks (<br> tags) from sources",
          values: [
            {
              value: 0,
              text: "never",
            },
            {
              value: 1,
              text: "in reading mode",
            },
            {
              value: 255,
              text: "always",
            },
          ],
          defaultValue: 0,
        },
        {
          id: "removeBackReferences",
          type: OptionType.SELECT,
          label: "Remove back-references from the beginning of sources",
          values: [
            {
              value: 0,
              text: "never",
            },
            {
              value: 1,
              text: "in reading mode",
            },
            {
              value: 255,
              text: "always",
            },
          ],
          defaultValue: 1,
        },
        {
          id: "indentSrcPlainText",
          type: OptionType.CHECKBOX,
          label: 'Indent plain text (like "See also:") in the Sources section',
          defaultValue: false,
        },
      ],
    },
    {
      type: OptionType.GROUP,
      label: "Inline Citations",
      options: [
        {
          id: "hideCitations",
          type: OptionType.SELECT,
          label: "Hide citation superscripts within the biography",
          values: [
            {
              value: 0,
              text: "never",
            },
            {
              value: 1,
              text: "in reading mode",
            },
            {
              value: 255,
              text: "always",
            },
          ],
          defaultValue: 0,
        },
        {
          id: "citationFormat",
          type: OptionType.SELECT,
          label: "Citation format",
          values: [
            {
              value: 0,
              text: "[1][2][3]",
            },
            {
              value: 2,
              text: "1,2,3",
            },
            {
              value: 3,
              text: "[1,2,3]",
            },
            {
              value: 1,
              text: "[1 2 3]",
            },
          ],
          defaultValue: 0,
        },
        {
          id: "citationSize",
          type: OptionType.SELECT,
          label: "Citation size",
          values: [
            {
              value: 60,
              text: "tiny",
            },
            {
              value: 80,
              text: "smaller",
            },
            {
              value: 100,
              text: "normal",
            },
            {
              value: 125,
              text: "larger",
            },
          ],
          defaultValue: 100,
        },
        {
          id: "citationSpacing",
          type: OptionType.SELECT,
          label: "Additional spacing between citation numbers",
          values: [
            {
              value: -10,
              text: "condensed",
            },
            {
              value: 0,
              text: "none",
            },
            {
              value: 10,
              text: "slight",
            },
            {
              value: 20,
              text: "extra",
            },
            {
              value: 40,
              text: "wide",
            },
          ],
          defaultValue: 0,
        },
        {
          id: "cleanCitations",
          type: OptionType.CHECKBOX,
          label: "Clean up citations (remove extra whitespace and underline)",
          defaultValue: false,
        },
        {
          id: "sortCitations",
          type: OptionType.CHECKBOX,
          label: "Sort adjacent citations by number",
          defaultValue: false,
        },
      ],
    },
    {
      type: OptionType.GROUP,
      label: "Hide Profile Elements",
      options: [
        {
          type: OptionType.GROUP,
          label: "Right Section",
          options: [
            {
              id: "hideSidebar",
              type: OptionType.SELECT,
              label: "Collapse the entire sidebar (and extend the content to full-width)",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideSidebarStatus",
              type: OptionType.SELECT,
              label: "Hide status blocks (like project protected) from the sidebar",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideForumPosts",
              type: OptionType.SELECT,
              label: "Hide G2G forum posts in the sidebar",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideDNAConnections",
              type: OptionType.SELECT,
              label: "Hide DNA connections in the sidebar",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 3,
                  text: "in reading mode when empty",
                },
                {
                  value: 253,
                  text: "always when empty",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideSidebarImages",
              type: OptionType.SELECT,
              label: "Hide popular images in the sidebar",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideCollaborationLinks",
              type: OptionType.SELECT,
              label: "Hide collaboration links in the sidebar",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideResearch",
              type: OptionType.SELECT,
              label: "Hide the research section in the sidebar",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
          ],
        },
        {
          type: OptionType.GROUP,
          label: "Top Section",
          options: [
            {
              id: "hideHeadingExtras",
              type: OptionType.SELECT,
              label: "Hide extra widgets and icons in the profile heading",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideThumbnail",
              type: OptionType.SELECT,
              label: "Hide the top-left thumbnail image",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 3,
                  text: "in reading mode when default",
                },
                {
                  value: 253,
                  text: "always when default",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hidePageTabs",
              type: OptionType.SELECT,
              label: "Hide the tabs at the top of the profile",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideViewTabs",
              type: OptionType.SELECT,
              label: "Hide the navigation buttons under the tabs",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideAuditData",
              type: OptionType.SELECT,
              label: "Hide the profile manager and last modified section",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideMemberSection",
              type: OptionType.SELECT,
              label: "Hide the Genealogist section",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
          ],
        },
        {
          type: OptionType.GROUP,
          label: "Biography Section",
          options: [
            {
              id: "hideEdits",
              type: OptionType.SELECT,
              label: "Hide edit links on the vitals and in the bio",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideStatus",
              type: OptionType.SELECT,
              label: "Hide project or research boxes",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideStickers",
              type: OptionType.SELECT,
              label: "Hide stickers",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideTableOfContents",
              type: OptionType.SELECT,
              label: "Hide the table of contents",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideInlineTables",
              type: OptionType.SELECT,
              label: "Hide all tables in the bio",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "hideInlineImages",
              type: OptionType.SELECT,
              label: "Hide inline images and captions in the bio",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
            {
              id: "collapseResearchNotes",
              type: OptionType.SELECT,
              label: "Collapse the Research Notes section",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 254,
                  text: "only on demand",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
          ],
        },
        {
          type: OptionType.GROUP,
          label: "Bottom Section",
          options: [
            {
              id: "hideComments",
              type: OptionType.SELECT,
              label: "Hide comments, memories, and merges",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideConnections",
              type: OptionType.SELECT,
              label: "Hide connections to famous people at the bottom",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideCategories",
              type: OptionType.SELECT,
              label: "Hide categories",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 1,
            },
            {
              id: "hideBackground",
              type: OptionType.SELECT,
              label: "Hide custom background images",
              values: [
                {
                  value: 0,
                  text: "never",
                },
                {
                  value: 1,
                  text: "in reading mode",
                },
                {
                  value: 255,
                  text: "always",
                },
              ],
              defaultValue: 0,
            },
          ],
        },
      ],
    },
  ],
};

registerFeature(readabilityFeature);
