/*
Created By: Ian Beacall (Beacall-6)
*/
import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Access Keys",
  id: "accessKeys",
  description: "Adds access keys to streamline and simplify the usage of different functionalities on WikiTree.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
  options: [
    // 1. Navigational
    {
      id: "Navigational",
      type: OptionType.GROUP,
      label: "Navigational",
      options: [
        {
          id: "Search",
          type: OptionType.CHECKBOX,
          label: "Open Search page (Access key: f)",
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
          id: "Watchlist",
          type: OptionType.CHECKBOX,
          label: "Open Your Watchlist (Access key: w)",
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
    // 2. Information Management Keys
    {
      id: "InformationManagementKeys",
      type: OptionType.GROUP,
      label: "Information Management Keys",
      options: [
        {
          id: "CopyID",
          type: OptionType.CHECKBOX,
          label: "Copy the WikiTree ID of the current profile (Access key: i)",
          defaultValue: true,
        },
        {
          id: "CopyLink",
          type: OptionType.CHECKBOX,
          label: "Copy the WikiTree link for the current profile (Access key: l)",
          defaultValue: true,
        },
        {
          id: "CopyURL",
          type: OptionType.CHECKBOX,
          label: "Copy the URL of the current profile (Access key: u)",
          defaultValue: true,
        },
        {
          id: "Notes",
          type: OptionType.CHECKBOX,
          label: "Clipboard and Notes: Toggle Notes (Access key: n)",
          defaultValue: true,
        },
        {
          id: "Clipboard",
          type: OptionType.CHECKBOX,
          label: "Clipboard and Notes: Toggle Clipboard (Access key: v)",
          defaultValue: true,
        },
        {
          id: "ExtraWatchlist",
          type: OptionType.CHECKBOX,
          label: "Toggle Extra Watchlist (Access key: x)",
          defaultValue: true,
        },
      ],
    },
    // 3. Profile
    {
      id: "Profile",
      type: OptionType.GROUP,
      label: "Profile",
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
          id: "Edit",
          type: OptionType.CHECKBOX,
          label: "Open an edit session (Access key: e)",
          defaultValue: true,
        },
        {
          id: "TreeApps",
          type: OptionType.CHECKBOX,
          label: "Open Tree Apps (Access key: t)",
          defaultValue: true,
        },
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
    // 4. Edit
    {
      id: "Edit",
      type: OptionType.GROUP,
      label: "Edit",
      options: [
        {
          id: "EnhancedEditor",
          type: OptionType.CHECKBOX,
          label: "Toggle Enhanced Editor (Access key: e)",
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
          label: "Press the Preview button (Access key: p)",
          defaultValue: true,
        },
        {
          id: "ReturnProfileDeleteDraft",
          type: OptionType.CHECKBOX,
          label: "Quit (Return to Profile / Delete Draft) without saving (Access key: q)",
          defaultValue: true,
        },
        {
          id: "Save",
          type: OptionType.CHECKBOX,
          label: "Save your current edit session (Access key: s)",
          defaultValue: true,
        },
        {
          id: "AGC",
          type: OptionType.CHECKBOX,
          label: "Run Automatic GEDCOM Cleanup (AGC) (Access key: a)",
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
  ],
});
