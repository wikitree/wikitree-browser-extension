import { registerFeature, OptionType } from "../core/options/options_registry";
import {
  /* eslint-disable no-unused-vars */
  isWikiPage,
  isWikiEdit,
  isWikiHistory,
  isProfilePage,
  isProfileUserPage,
  isProfileLoggedInUserPage,
  isProfileEdit,
  isProfileAddRelative,
  isAddUnrelatedPerson,
  isProfileHistory,
  isProfileHistoryDetail,
  isSpacePage,
  isSpaceEdit,
  isSpaceHistory,
  isNewSpace,
  isMediaWikiPage,
  isMediaWikiEdit,
  isMediaWikiHistory,
  isCategoryPage,
  isCategoryEdit,
  isCategoryHistory,
  isTemplatePage,
  isTemplateEdit,
  isTemplateHistory,
  isHelpPage,
  isHelpEdit,
  isHelpHistory,
  isOtherPage,
  isOtherEdit,
  isOtherHistory,
  isSpecialPage,
  isSpecialBadges,
  isSpecialDNATests,
  isSpecialMyConnections,
  isSpecialWatchedList,
  isG2G,
  isDNADescendants,
  isMainDomain,
  isSearchPage,
  isMergeEdit,
  /* eslint-enable no-unused-vars */
} from "../core/pageType";

// Just importing this file will register all the features

////////////////////////////////////////////////////////////////////////////////
// For features with options they should have their own module to register
// the feature and options
////////////////////////////////////////////////////////////////////////////////

import "./add_person/add_person_options";
import "./add_search_boxes/add_search_boxes_options";
import "./agc/agc_options";
import "./anniversaries_table/anniversaries_table_options";
import "./auto_bio/auto_bio_options";
import "./auto_categories/auto_categories_options";
import "./access_keys/access_keys_options";
import "./categoryDisplay/categoryDisplay_options";
import "./category_filters/category_filters_options";
import "./category_management/category_management_options";
import "./category_tables/category_tables_options";
import "./cc7_changes/cc7_changes_options";
import "./change_family_lists/change_family_lists_options";
import "./connection_finder/connection_finder_options";
import "./copy_bio_changes/copy_bio_changes_options";
import "./custom_change_summary_options/custom_change_summary_options_options";
import "./custom_style/custom_style_options";
import "./darkMode/darkMode_options";
import "./date_fixer/date_fixer_options";
import "./enhanced_editor_style/enhanced_editor_style_options";
import "./edit_family_data/edit_family_data_options";
import "./editor_expander/editor_expander_options";
import "./extra_watchlist/extra_watchlist_options";
import "./family_dropdown/family_dropdown_options";
import "./family_lists/family_lists_options";
import "./locationsHelper/locationsHelper_options";
import "./g2g/g2g_options";
import "./genderPredictor/gender_predictor_options";
import "./hide_my_contributions/hide_my_contributions_options";
import "./image_zoom/image_zoom_options";
import "./language_setting/language_setting_options";
import "./printerfriendly/printerfriendly_options";
import "./randomProfile/randomProfile_options";
import "./readability/readability_options";
import "./redir_ext_links/redir_ext_links_options";
import "./save_buttons_style_options/save_buttons_style_options_options";
import "./scissors/scissors_options";
import "./shareable_sources/shareable_sources_options";
import "./sourcepreview/sourcepreview_options";
import "./spacepreview/spacepreview_options";
import "./table_filters/table_filters_options";
import "./unconnected_branch_table/unconnected_branch_table_options";
import "./usability_tweaks/usability_tweaks_options";
import "./what_links_here/what_links_here_options";
import "./wikitable_wizard/wikitable_wizard_options";
import "./wills/wills_options";
import "./wtPlus/wtPlus_options";

////////////////////////////////////////////////////////////////////////////////
// Simple features with no options can be registered here
////////////////////////////////////////////////////////////////////////////////

registerFeature({
  name: "AKA Name Links",
  id: "akaNameLinks",
  description: 'Adds surname page links to the "aka" names on the profile page.',
  category: "Navigation",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
});

registerFeature({
  name: "Apps Menu",
  id: "appsMenu",
  description: "Adds an apps submenu to the Find menu.",
  category: "Navigation/Find_Menu",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
});

registerFeature({
  name: "Bio Check",
  id: "bioCheck",
  description: "Check biography sources and style.",
  category: "Editing",
  creators: [{ name: "Kay Knight", wikitreeid: "Sands-1865" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson, isSpecialWatchedList],
});

registerFeature({
  name: "Category Finder Pins",
  id: "categoryFinderPins",
  description:
    "Adds pins to Category Finder results (on the edit page), similar to the pins in the location dropdown.  These pins link to the category page for you to check that you have the right category.",
  category: "Navigation",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isWikiEdit],
});

registerFeature({
  name: "Clipboard and Notes",
  id: "clipboardAndNotes",
  description: "Keep useful things for pasting in the Clipboard and useful notes in the Notes.",
  category: "Global",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
  defaultValue: false,
  pages: [isMainDomain],
});

registerFeature({
  name: "Collapsible Descendants Tree",
  id: "collapsibleDescendantsTree",
  description: "Makes the descendants tree on profile pages collapsible.",
  creators: [{ name: "Julian Laffey", wikitreeid: "Laffey-98" }],
  contributors: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  category: "Profile",
  defaultValue: true,
  pages: [isProfilePage, isDNADescendants],
});

registerFeature({
  name: "Confirm Thank Yous",
  id: "confirmThankYous",
  description: "Adds a confirmation to 'Thank you' links.",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  category: "Community",
  defaultValue: false,
  pages: [isMainDomain],
});

registerFeature({
  name: "Distance and Relationship",
  id: "distanceAndRelationship",
  description: "Adds the distance (degrees) between you and the profile person and any relationship between you.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
  defaultValue: true,
  pages: [isProfilePage],
});

registerFeature({
  name: "DNA Connections Table",
  id: "dnaTable",
  description: "Adds birthplaces to DNA Connections table.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpecialDNATests],
});

registerFeature({
  name: "Draft List",
  id: "draftList",
  description: "Adds a button to the Find menu to show your uncommitted drafts.",
  category: "Navigation/Find_Menu",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isMainDomain],
});

registerFeature({
  name: "Family Group",
  id: "familyGroup",
  description: "Display dates and locations of all family members. A button is added to the profile submenu.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfilePage],
});

registerFeature({
  name: "Family Timeline",
  id: "familyTimeline",
  description: "Displays a family timeline. A button is added to the profile submenu.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [{ name: "Riël Smit", wikitreeid: "Smit-641" }],
  defaultValue: true,
  pages: [isProfilePage],
});

registerFeature({
  name: "Make Radio Buttons De-selectable",
  id: "makeRadioButtonsDeselectable",
  description: "Makes radio buttons de-selectable.  Click on a previously selected status value to clear it.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileEdit, isProfileAddRelative, isAddUnrelatedPerson, isMergeEdit, isSpaceEdit],
});

registerFeature({
  name: "Migration Category Helper",
  id: "migrationCategoryHelper",
  description: "Automatically populates migration categories when a new one is opened for editing.",
  category: "Editing",
  creators: [{ name: "Florian Straub", wikitreeid: "Straub-620" }],
  contributors: [],
  defaultValue: true,
  pages: [isCategoryEdit],
});

registerFeature({
  name: "My Connections",
  id: "myConnections",
  description:
    "Adds buttons to the My Connections page to create tables of the people in each degree," +
    " showing missing parents, possible missing spouses, and the number of children. Also, continues finding more connections in a degree after the maximum 1000 has been reached.",
  category: "Other",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isSpecialMyConnections],
});

registerFeature({
  name: "My Menu",
  id: "myMenu",
  description: "Add your own custom menu for easy access to your most commonly used links.",
  category: "Navigation",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});

registerFeature({
  name: "Smooth Scrolling",
  id: "smoothScrolling",
  description: "Scroll the window smoothly when linking to specific sections of the page.",
  category: "Global/Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});

registerFeature({
  name: "Sort Badges",
  id: "sortBadges",
  description: "Buttons to move or hide your Club 100/1000 badges.",
  category: "Community",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileLoggedInUserPage, isSpecialBadges],
});

registerFeature({
  name: "Sort Theme People",
  id: "sortThemePeople",
  description:
    "Replaces the Connection Finder (theme of the week) section on Profile pages with a table sorted by degree of closeness to the profile person.",
  category: "Profile",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage],
});

registerFeature({
  name: "Sticky Header",
  id: "stickyHeader",
  description: "Makes the WikiTree header stick to the top and more compact on narrow screens.",
  category: "Global/Style",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
});

registerFeature({
  name: "Sticky Toolbar",
  id: "stickyToolbar",
  description:
    "Makes the toolbar on the editor on edit pages stick to the top of the screen and not scroll out of sight.",
  category: "Editing",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isWikiEdit],
});

registerFeature({
  name: "Suggested Matches Filters",
  id: "suggestedMatchesFilters",
  description: "Lets you filter out suggested matches for new profiles by location, name, and/or date.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileAddRelative, isAddUnrelatedPerson],
});

registerFeature({
  name: "Verify ID",
  id: "verifyID",
  description:
    "When attaching a person by ID, you can see some details of the person and check that you've entered the correct ID.",
  category: "Editing/Add_Person",
  creators: [{ name: "Ian Beacall", wikitreeid: "Beacall-6" }],
  contributors: [],
  defaultValue: true,
  pages: [isProfileAddRelative],
});

registerFeature({
  name: "Visited Links",
  id: "visitedLinks",
  description: "Change the color of links to visited pages.",
  category: "Global/Style",
  creators: [{ name: "Aleš Trtnik", wikitreeid: "Trtnik-2" }],
  contributors: [],
  defaultValue: false,
  pages: [isMainDomain],
  options: [
    {
      id: "color",
      type: "color",
      label: "Visited link color",
      defaultValue: "#d110d1",
    },
  ],
});

/*
 * debugging features for development only
 *
registerFeature({
  name: "Debug Profile Classes",
  id: "debugProfileClasses",
  description: "Highlights various sections of page profiles (for testing the core profileClasses code).",
  category: "Debug",
  creators: [{ name: "Jonathan Duke", wikitreeid: "Duke-5773" }],
  contributors: [],
  defaultValue: false,
  pages: [isProfilePage, isSpacePage, isCategoryPage],
});
// end debugging section */
