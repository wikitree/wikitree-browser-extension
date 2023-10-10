document?.documentElement?.removeAttribute("data-wbe-conflict");

//import { createTopMenu } from "./core/common";

import "./features/register_feature_options";

// First are loaded modules that change the wikitree appearence by altering css style
import "./features/visitedLinks/visitedLinks";
import "./features/darkMode/darkMode";
import "./features/enhanced_editor_style/enhanced_editor_style";
import "./features/readability/readability";
import "./features/custom_style/custom_style";

// followed by the rest
import "./features/access_keys/access_keys";
import "./features/add_search_boxes/add_search_boxes";
import "./features/akaNameLinks/akaNameLinks";
import "./features/anniversaries_table/anniversaries_table";
import "./features/categoryDisplay/categoryDisplay";
import "./features/categoryFinderPins/categoryFinderPins";
import "./features/change_family_lists/change_family_lists";
import "./features/clipboard_and_notes/clipboard_and_notes";
import "./features/collapsibleDescendantsTree/collapsibleDescendantsTree";
import "./features/confirm_thank_yous/confirm_thank_yous";
import "./features/connection_finder/connection_finder";
import "./features/copy_bio_changes/copy_bio_changes";
import "./features/distanceAndRelationship/distanceAndRelationship";
import "./features/dna_table/dna_table";
import "./features/extra_watchlist/extra_watchlist";
import "./features/familyGroup/familyGroup";
import "./features/family_dropdown/family_dropdown";
import "./features/family_lists/family_lists";
import "./features/familyTimeline/familyTimeline";
import "./features/g2g/g2g";
import "./features/hide_my_contributions/hide_my_contributions";
import "./features/image_zoom/image_zoom";
import "./features/my_connections/my_connections";
import "./features/my_menu/my_menu";
import "./features/printerfriendly/printerfriendly";
import "./features/redir_ext_links/redir_ext_links";
import "./features/scissors/scissors";
import "./features/shareable_sources/shareable_sources";
import "./features/smooth_scrolling/smooth_scrolling";
import "./features/sortBadges/sortBadges";
import "./features/sort_theme_people/sort_theme_people";
import "./features/sourcepreview/sourcepreview";
import "./features/spacepreview/spacepreview";
import "./features/sticky_header/sticky_header";
import "./features/table_filters/table_filters";
import "./features/unconnected_branch_table/unconnected_branch_table";
import "./features/usability_tweaks/usability_tweaks";
import "./features/wills/wills";

// Edit mode addons are towards the end
import "./features/wtPlus/wtPlus";
import "./features/agc/agc_content";
import "./features/auto_bio/auto_bio";
import "./features/auto_categories/auto_categories";
import "./features/custom_change_summary_options/custom_change_summary_options";
import "./features/date_fixer/date_fixer";
import "./features/language_setting/language_setting";
import "./features/locationsHelper/locationsHelper";
import "./features/make_radio_buttons_deselectable/make_radio_buttons_deselectable";
import "./features/migration_category_helper/migration_category_helper";
import "./features/save_buttons_style_options/save_buttons_style_options";
import "./features/sticky_toolbar/sticky_toolbar";
import "./features/wikitable_wizard/wikitable_wizard";
// BioCheck needs to load later than custom_change_summary_options
import "./features/bioCheck/bioCheck";

// Edit mode Add Person addons are even later
import "./features/add_person/add_person";
import "./features/genderPredictor/genderPredictor";
import "./features/suggested_matches_filters/suggested_matches_filters";
import "./features/verifyID/verifyID";

// At the end are the features, that add items into menu structure.
import "./features/appsMenu/appsMenu";
import "./features/category_tables/category_tables";
import "./features/category_filters/category_filters";
import "./features/category_management/category_management";
import "./features/cc7_changes/cc7_changes";
import "./features/edit_family_data/edit_family_data";
import "./features/editor_expander/editor_expander";
import "./features/draftList/draftList";
import "./features/randomProfile/randomProfile";
import "./features/what_links_here/what_links_here";

/*
 * debugging features for development only
 *
import "./features/debugProfileClasses/debugProfileClasses";
// end debugging section */

import "./core/editToolbar/editToolbar";

//createTopMenu();

window.setTimeout(function () {
  if (document?.documentElement?.getAttribute("data-wbe-conflict")) {
    console.warn(
      "WikiTree Browser Extension conflict detected: " + document.documentElement.getAttribute("data-wbe-conflict")
    );
    /*
    document.getElementById("conflictAlert")?.remove();
    let conflictAlert = document.createElement("dialog");
    conflictAlert.id = "conflictAlert";
    conflictAlert.style = "max-width:480px;border:3px solid #fbb616;border-radius:1em;";
    conflictAlert.innerText =
      "The WikiTree Browser Extension has reloaded or a conflicting version has been installed. Make sure features are enabled in only one version at a time. Some features may no longer work until this page is refreshed. If you were still working on this page, you can click anywhere to resume.";
    conflictAlert.addEventListener("click", function () {
      this.close();
    });
    document.body.prepend(conflictAlert);
    conflictAlert.showModal();
    */
  }
}, 2000);
