import { registerFeature } from "../core/options/options_registry";

// Just importing this file will register all the features

////////////////////////////////////////////////////////////////////////////////
// For features with options they should have their own module to register
// the feature and options
////////////////////////////////////////////////////////////////////////////////

import "./agc/agc_options.js";
import "./categoryDisplay/categoryDisplay_options.js";
import "./darkMode/darkMode_options.js";
import "./g2g/g2g_options.js";
import "./genderPredictor/gender_predictor_options.js";
import "./change_family_lists/change_family_lists_options.js";
import "./randomProfile/randomProfile_options.js";
import "./redir_ext_links/redir_ext_links_options.js";

////////////////////////////////////////////////////////////////////////////////
// Simple features with no options can be registered here
////////////////////////////////////////////////////////////////////////////////
registerFeature({
  name: "AKA Name Links",
  id: "akaNameLinks",
  description: 'Adds surname page links to the "aka" names on the profile page.',
  category: "Profile",
  defaultValue: true,
});

registerFeature({
  name: "Apps Menu",
  id: "appsMenu",
  description: "Adds an apps submenu to the Find menu.",
  category: "Global",
  defaultValue: true,
});

registerFeature({
  name: "Bio Check",
  id: "bioCheck",
  description: "Check biography style and sources.",
  category: "Editing",
  defaultValue: true,
});

registerFeature({
  name: "Category Finder Pins",
  id: "categoryFinderPins",
  description:
    "Adds pins to Category Finder results (on the edit page), similar to the pins in the location dropdown.  These pins link to the category page for you to check that you have the right category.",
  category: "Editing",
  defaultValue: true,
});

registerFeature({
  name: "Clipboard and Notes",
  id: "clipboardAndNotes",
  description: "Keep useful things for pasting in the clipboard and useful notes in the notes.",
  category: "Global",
  defaultValue: false,
});

registerFeature({
  name: "Collapsible Descendants Tree",
  id: "collapsibleDescendantsTree",
  description: "Makes the descendants tree on profile pages collapsible.",
  category: "Profile",
  defaultValue: true,
});

registerFeature({
  name: "Collapsible Sources",
  id: "collapsibleSources",
  description:
    "Makes the page shorter by hiding the inline citations on load.  " +
    "To see the inline citations, click the black triangle button next to the Sources heading, click the superscript number of the citation, " +
    "or use the Source Preview feature of this extension.",
  category: "Profile",
  defaultValue: false,
});

registerFeature({
  name: "Distance and Relationship",
  id: "distanceAndRelationship",
  description: "Adds the distance (degrees) between you and the profile person and any relationship between you.",
  category: "Profile",
  defaultValue: true,
});

registerFeature({
  name: "Draft List",
  id: "draftList",
  description: "Adds a button to the Find menu to show your uncommitted drafts.",
  category: "Global",
  defaultValue: true,
});

registerFeature({
  name: "Dates/Locations on New Profile Page",
  id: "editFamilyData",
  description:
    "Adds the dates and locations of the profile person to a new profile page (for a parents, sibling, etc.).",
  category: "Editing",
  defaultValue: true,
});

registerFeature({
  name: "Family Group",
  id: "familyGroup",
  description: "Display dates and locations of all family members. A button is added to the profile submenu.",
  category: "Profile",
  defaultValue: true,
});

registerFeature({
  name: "Family Timeline",
  id: "familyTimeline",
  description: "Displays a family timeline. A button is added to the profile submenu.",
  category: "Profile",
  defaultValue: true,
});

registerFeature({
  name: "Google Search Box",
  id: "googleSearchBox",
  description: "Adds a Google Search Box to the bottom of every page.",
  category: "Global",
  defaultValue: false,
});

registerFeature({
  name: "Locations Helper",
  id: "locationsHelper",
  description:
    "Manipulates the suggested locations, highlighting likely correct locations," +
    " based on family members' locations, and demoting likely wrong locations, based on the dates.",
  category: "Editing",
  defaultValue: true,
});

registerFeature({
  name: "Make Radio Buttons De-selectable",
  id: "makeRadioButtonsDeselectable",
  description: "Makes radio buttons de-selectable.  Click on a previously selected status value to clear it.",
  category: "Editing",
  defaultValue: true,
});

registerFeature({
  name: "My Menu",
  id: "myMenu",
  description: "Add your own custom menu for easy access to your most commonly used links.",
  category: "Global",
  defaultValue: false,
});

registerFeature({
  name: "Printer Friendly Bio",
  id: "printerFriendly",
  description: "Change the page to a printer-friendly one.",
  category: "Global",
  defaultValue: true,
});

registerFeature({
  name: "Sort Badges",
  id: "sortBadges",
  description: "Buttons to move or hide your Club 100/1000 badges.",
  category: "Other",
  defaultValue: true,
});

registerFeature({
  name: "Sort Theme People",
  id: "sortThemePeople",
  description:
    "Replaces the Connection Finder (theme of the week) section on Profile pages with a table sorted by degree of closeness to the profile person.",
  category: "Profile",
  defaultValue: false,
});

registerFeature({
  name: "Source Previews",
  id: "sPreviews",
  description: "Enable source previews on inline references.",
  category: "Global",
  defaultValue: false,
});

registerFeature({
  name: "Space Page Previews",
  id: "spacePreviews",
  description: "Enable previews of Space Pages on hover.",
  category: "Global",
  defaultValue: false,
});

registerFeature({
  name: "Verify ID",
  id: "verifyID",
  description:
    "When attaching a person by ID, you can see some details of the person and check that you've entered the correct ID.",
  category: "Editing",
  defaultValue: true,
});

registerFeature({
  name: "WikiTree+ Edit Helper",
  id: "wtplus",
  description: "Adds multiple editing features.",
  category: "Editing",
  defaultValue: true,
});
