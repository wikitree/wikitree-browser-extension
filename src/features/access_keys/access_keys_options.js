/*
Created By: Ian Beacall (Beacall-6)
*/
import { isMainDomain } from "../../core/pageType.js";
import { registerFeature, OptionType } from "../../core/options/options_registry";

registerFeature({
  name: "Access Keys",
  id: "accessKeys",
  description:
    "Adds access keys to streamline and simplify the usage of different functionalities on WikiTree. Supports both synthetic hotkeys (prefix+key) and browser access keys (Shift+Alt+key on PC, Ctrl+Option+key on Mac). In text areas and input fields, only browser access keys work to avoid interfering with typing.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
  options: [
    {
      id: "Configuration",
      type: OptionType.GROUP,
      label: "Configuration",
      options: [
        {
          id: "PrefixKey",
          type: OptionType.SELECT,
          label: "Prefix key to activate shortcuts",
          defaultValue: "w",
          values: [
            { value: "a", text: "A" },
            { value: "b", text: "B" },
            { value: "c", text: "C" },
            { value: "d", text: "D" },
            { value: "e", text: "E" },
            { value: "f", text: "F" },
            { value: "g", text: "G" },
            { value: "h", text: "H" },
            { value: "i", text: "I" },
            { value: "j", text: "J" },
            { value: "k", text: "K" },
            { value: "l", text: "L" },
            { value: "m", text: "M" },
            { value: "n", text: "N" },
            { value: "o", text: "O" },
            { value: "p", text: "P" },
            { value: "q", text: "Q" },
            { value: "r", text: "R" },
            { value: "s", text: "S" },
            { value: "t", text: "T" },
            { value: "u", text: "U" },
            { value: "v", text: "V" },
            { value: "w", text: "W" },
            { value: "x", text: "X" },
            { value: "y", text: "Y" },
            { value: "z", text: "Z" },
          ],
        },
        {
          id: "SequenceTimeoutMs",
          type: OptionType.NUMBER,
          label: "Timeout for key sequences (milliseconds)",
          defaultValue: 1800,
          min: 500,
          max: 5000,
        },
        {
          id: "EnableBrowserAccessKeys",
          type: OptionType.CHECKBOX,
          label: "Enable browser access keys (Shift+Alt+letter on PC, Ctrl+Option+letter on Mac)",
          defaultValue: true,
        },
        {
          id: "EnableSyntheticHotkeys",
          type: OptionType.CHECKBOX,
          label: "Enable synthetic hotkeys (prefix + key)",
          defaultValue: true,
        },
        {
          id: "EnableCheatSheetToggle",
          type: OptionType.CHECKBOX,
          label: "Enable cheat sheet toggle (Shift + ?)",
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
        {
          id: "JumpNav",
          type: OptionType.CHECKBOX,
          label: "Jump Navigation (Access keys: 1/2-9)",
          defaultValue: true,
        },
        {
          id: "JumpNavHints",
          type: OptionType.CHECKBOX,
          label: "Show hints on Jump Navigation",
          defaultValue: false,
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
          label: "Copy the WikiTree ID of the current profile (Access key: i)",
          defaultValue: true,
        },
        {
          id: "CopyUserID",
          type: OptionType.CHECKBOX,
          label: "Copy the User (number) ID of the current profile (Access key: j)",
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
          id: "DiscardDraft",
          type: OptionType.CHECKBOX,
          label: "Discard draft (Access key: e)",
          defaultValue: false,
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
        {
          id: "FamilyDropdown",
          type: OptionType.CHECKBOX,
          label: "Open Family Dropdown/Shared Sources (Access key: y; then use shift + up or down arrow to navigate)",
          defaultValue: true,
        },
      ],
    },
    // 5. Add Person
    {
      id: "AddPerson",
      type: OptionType.GROUP,
      label: "Add Person",
      options: [
        {
          id: "DismissMatches",
          type: OptionType.CHECKBOX,
          label: "Dismiss Matches button (Access key: s)",
          defaultValue: true,
        },
        {
          id: "EnterBasicData",
          type: OptionType.CHECKBOX,
          label: "Enter Basic Data button (Access key: s)",
          defaultValue: true,
        },
      ],
    },
  ],
});
