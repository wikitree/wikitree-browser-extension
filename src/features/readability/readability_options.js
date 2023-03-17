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
          store.get("formatSourceReferenceNumbers_options")
        ]).then(async (values) => {
          console.log("options from merged features imported: " + JSON.stringify(values));
          if (!!values[0].accessibility || !!values[2].readingMode || !!values[5].collapsibleSources || !!values[6].formatSourceReferenceNumbers) {
            let options = {
              readability: true,
              readability_options: {
                ...values[1].accessibility_options,
                ...values[3].readingMode_options,
                ...values[4],
                ...values[7].formatSourceReferenceNumbers_options
              }
            };
            options.readingMode = !!values[2].readingMode;
            options.collapseSources = options.collapseSources || !!values[5].collapsibleSources;
            options.cleanCitations = options.cleanCitations || !!values[6].formatSourceReferenceNumbers;
            await Promise.all([
              store.set(options)
            ]);
          }
        });
      }
    });
  }
})(chrome.storage.sync);

const readabilityFeature = {
  name: "Readability Options",
  id: "readability",
  description: "Enable reading mode to toggle the WikiTree interface on and off when browsing profiles. Configure additional styling options to make profiles more readable. (<a href='https://www.wikitree.com/wiki/Space:WikiTree_Browser_Extension#Readability_Options' target='_blank'>More details</a>)",
  category: "Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  defaultValue: false,
  pages: [isProfilePage, isSpacePage, isCategoryPage],

  options: [
    {
      id: "accessibilityGroup",
      type: OptionType.GROUP,
      label: "Accessibility Options",
      options: [
        {
          id: "listItemSpacing",
          type: OptionType.SELECT,
          label: "The amount of spacing to add between list items",
          values: [
            {
              value: 0,
              text: "none",
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
          defaultValue: 100,
        },
        {
          id: "mergeAdjacentLists",
          type: OptionType.CHECKBOX,
          label: "Remove extra line spacing (added by profile editors) from between adjacent bullet list items.",
          defaultValue: false,
        },
        {
          id: "spaceSourceItemsOnly",
          type: OptionType.CHECKBOX,
          label: "Limit spacing rules to only lists under the Sources section.",
          defaultValue: true,
        },
        {
          id: "boldSources",
          type: OptionType.CHECKBOX,
          label: "Bold the first segment of each source citation for readability.",
          defaultValue: true,
        },
        {
          id: "removeSourceBreaks",
          type: OptionType.CHECKBOX,
          label: "Remove extra line breaks (added by profile editors) from the middle of source citations.",
          defaultValue: false,
        },
        {
          id: "removeSourceLabels",
          type: OptionType.CHECKBOX,
          label: "Remove extra source labels (added by profile editors) from the beginning of source citations.",
          defaultValue: false,
        },
        {
          id: "cleanCitations",
          type: OptionType.CHECKBOX,
          label: "Clean up citations by merging adjacent numbers into one list that is sorted and easier to read.",
          defaultValue: true,
        },
        {
          id: "removeBackReferences",
          type: OptionType.CHECKBOX,
          label: "Remove back-references from the beginning of source citations.",
          defaultValue: false,
        }
      ]
    },
    {
      id: "readingModeGroup",
      type: OptionType.GROUP,
      label: "Reading Mode",
      options: [
        {
          id: "readingMode",
          type: OptionType.CHECKBOX,
          label: "Enable the reading mode option (adds the toggle switch on the page).",
          defaultValue: true,
        },
        {
          id: "readingMode_toggle",
          type: OptionType.CHECKBOX,
          label: "If enabled, toggles reading mode on and off (can also be done with the toggle switch on the page).",
          defaultValue: false,
        },
        {
          id: "hideSideBar",
          type: OptionType.CHECKBOX,
          label: "Hide the right-hand column with DNA connections, images, etc.",
          defaultValue: true,
        },
        {
          id: "hideHeadingExtras",
          type: OptionType.CHECKBOX,
          label: "Hide extra widgets (copy) and icons (privacy) in the profile heading.",
          defaultValue: true,
        },
        {
          id: "hidePageTabs",
          type: OptionType.CHECKBOX,
          label: "Hide the tabs at the top of the profile.",
          defaultValue: true,
        },
        {
          id: "hideViewTabs",
          type: OptionType.CHECKBOX,
          label: "Hide the navigation buttons under the tabs section.",
          defaultValue: true,
        },
        {
          id: "hideAuditData",
          type: OptionType.CHECKBOX,
          label: "Hide the profile manager, last modified/accessed, etc.",
          defaultValue: true,
        },
        {
          id: "hideEdits",
          type: OptionType.CHECKBOX,
          label: "Hide edit links on the vitals and in the bio.",
          defaultValue: true,
        },
        {
          id: "hideStatus",
          type: OptionType.CHECKBOX,
          label: "Hide project or research boxes.",
          defaultValue: false,
        },
        {
          id: "hideStickers",
          type: OptionType.CHECKBOX,
          label: "Hide stickers at the top of the bio.",
          defaultValue: false,
        },
        {
          id: "hideTableOfContents",
          type: OptionType.CHECKBOX,
          label: "Hide the table of contents.",
          defaultValue: false,
        },
        {
          id: "hideInlineTables",
          type: OptionType.CHECKBOX,
          label: "Hide all tables in the bio.",
          defaultValue: false,
        },
        {
          id: "hideInlineImages",
          type: OptionType.CHECKBOX,
          label: "Hide inline images and captions in the bio.",
          defaultValue: false,
        },
        {
          id: "hideCitations",
          type: OptionType.CHECKBOX,
          label: "Hide citation superscripts within the biography.",
          defaultValue: false,
        },
        {
          id: "collapseSources",
          type: OptionType.CHECKBOX,
          label: "Collapse the entire Sources section (the header can still be expanded).",
          defaultValue: true,
        },
        {
          id: "hideComments",
          type: OptionType.CHECKBOX,
          label: "Hide comments, memories, and merges.",
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
        {
          id: "hideBackground",
          type: OptionType.CHECKBOX,
          label: "Hide custom background images.",
          defaultValue: false,
        }
      ]
    }
  ]
};

registerFeature(readabilityFeature);
