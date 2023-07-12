/*
Created By: Ian Beacall (Beacall-6)
*/

import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Access Keys",
  id: "accessKeys",
  description: "Adds access keys to streamline and simplify the usage of different functionalities on WikiTree.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [true],
  options: [
    {
      id: "EditSessionKeys",
      type: OptionType.GROUP,
      label: "Edit Session Keys",
      options: [
        {
          id: "Edit",
          type: OptionType.CHECKBOX,
          label: "Open an edit session (Access key: e)",
          defaultValue: true,
        },
        {
          id: "Compare",
          type: OptionType.CHECKBOX,
          label: "Compare draft with saved information (Access key: c)",
          defaultValue: true,
        },
        {
          id: "Preview",
          type: OptionType.CHECKBOX,
          label: "Press the Preview button in Edit mode (Access key: p)",
          defaultValue: true,
        },
        {
          id: "ReturnProfileDeleteDraft",
          type: OptionType.CHECKBOX,
          label: "Return to profile / Delete draft (Access key: q)",
          defaultValue: true,
        },
        {
          id: "Save",
          type: OptionType.CHECKBOX,
          label: "Save your current edit session (Access key: s)",
          defaultValue: true,
        },
        {
          id: "EnhancedEditor",
          type: OptionType.CHECKBOX,
          label: "Toggle Enhanced Editor (Access key: e)",
          defaultValue: true,
        },
      ],
    },
    {
      id: "ContentEnhancementKeys",
      type: OptionType.GROUP,
      label: "Content Enhancement Keys",
      options: [
        {
          id: "AGC",
          type: OptionType.CHECKBOX,
          label: "Run Auto GEDCOM Cleanup (Access key: a)",
          defaultValue: true,
        },
        {
          id: "AutoBio",
          type: OptionType.CHECKBOX,
          label: "Run Auto Bio (Access key: b)",
          defaultValue: true,
        },
        {
          id: "Category",
          type: OptionType.CHECKBOX,
          label: "Open the Category helper box (Access key: k)",
          defaultValue: true,
        },
        {
          id: "AddTemplate",
          type: OptionType.CHECKBOX,
          label: "Add any template (Access key: t)",
          defaultValue: true,
        },
      ],
    },
    {
      id: "InformationManagementKeys",
      type: OptionType.GROUP,
      label: "Information Management Keys",
      options: [
        {
          id: "CopyID",
          type: OptionType.CHECKBOX,
          label: "Copy the WikiTree ID of the current profile into the clipboard (Access key: i)",
          defaultValue: true,
        },
        {
          id: "CopyLink",
          type: OptionType.CHECKBOX,
          label: "Copy the WikiTree link for the current profile into the clipboard (Access key: l)",
          defaultValue: true,
        },
        {
          id: "CopyURL",
          type: OptionType.CHECKBOX,
          label: "Copy the URL of the current profile into the clipboard (Access key: u)",
          defaultValue: true,
        },
        {
          id: "Clipboard",
          type: OptionType.CHECKBOX,
          label: "Clipboard and Notes: Toggle Clipboard (Access key: v)",
          defaultValue: true,
        },
        {
          id: "Notes",
          type: OptionType.CHECKBOX,
          label: "Clipboard and Notes: Toggle Notes (Access key: n)",
          defaultValue: true,
        },
        {
          id: "ExtraWatchlist",
          type: OptionType.CHECKBOX,
          label: "Toggle Extra Watchlist (Access key: w)",
          defaultValue: true,
        },
      ],
    },
    {
      id: "ImageHandlingKeys",
      type: OptionType.GROUP,
      label: "Image Handling Keys",
      options: [
        {
          id: "Magnifier",
          type: OptionType.CHECKBOX,
          label: "Image Zoom and Magnifier: Toggle Magnifier (Access key: m)",
          defaultValue: true,
        },
        {
          id: "ZoomInPlace",
          type: OptionType.CHECKBOX,
          label: "Image Zoom and Magnifier: Toggle 'Zoom in Place' (Access key: z)",
          defaultValue: true,
        },
      ],
    },
    {
      id: "Navigational",
      type: OptionType.GROUP,
      label: "Navigational",
      options: [
        {
          id: "Ancestors",
          type: OptionType.CHECKBOX,
          label: "Show ancestors (Access key: a)",
          defaultValue: true,
        },
        {
          id: "Descendants",
          type: OptionType.CHECKBOX,
          label: "Show descendants (Access key: d)",
          defaultValue: true,
        },
        {
          id: "G2G",
          type: OptionType.CHECKBOX,
          label: "Open the G2G Recent Activity page (Access key: g)",
          defaultValue: true,
        },
        {
          id: "HelpSearch",
          type: OptionType.CHECKBOX,
          label: "Open Help Search (Access key: h)",
          defaultValue: true,
        },
        {
          id: "RandomProfile",
          type: OptionType.CHECKBOX,
          label: "Open a random profile (Access key: r)",
          defaultValue: true,
        },
        {
          id: "TreeApps",
          type: OptionType.CHECKBOX,
          label: "Open Tree Apps (Access key: t)",
          defaultValue: true,
        },
        {
          id: "NavHomePage",
          type: OptionType.CHECKBOX,
          label: "Open Nav Home Page (Access key: 1)",
          defaultValue: true,
        },
      ],
    },
  ],
});
