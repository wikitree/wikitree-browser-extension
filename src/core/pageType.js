/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import $ from "jquery";

// Any wiki page with pageID
export let isWikiPage = false;
// Profile page
export let isProfilePage = false;
// Profile of a User page
export let isProfileUserPage = false;
// Profile of a Logged in User page
export let isProfileLoggedInUserPage = false;
// Space page
export let isSpacePage = false;
// Category page
export let isCategoryPage = false;
// Template page
export let isTemplatePage = false;
// Help page
export let isHelpPage = false;
// Other wiki page (Project:, Docs:, Automated:, ...)
export let isOtherPage = false;

// Special: page
export let isSpecialPage = false;
// Special: Badges page
export let isSpecialBadges = false;
// Special: MyConnections page
export let isSpecialMyConnections = false;
// Special: DNATests page
export let isSpecialDNATests = false;
// Special: WatchedList page
export let isSpecialWatchedList = false;

// Any Edit page with pageID
export let isWikiEdit = false;
// Profile edit page
export let isProfileEdit = false;
// Profile add relative
export let isProfileAddRelative = false;
// Space edit page
export let isSpaceEdit = false;
// Category edit page
export let isCategoryEdit = false;
// Template edit page
export let isTemplateEdit = false;
// Help edit page
export let isHelpEdit = false;
// Other wiki edit page (Project:, Docs:, Automated:, ...)
export let isOtherEdit = false;

export let isG2G = false;

if (
  // Profile Edit Page
  window.location.href.match(/\/index.php\?title=Special:EditPerson&.*/g)
) {
  isProfileEdit = true;
} else if (
  // Profile Add relative
  window.location.href.match(/\/index.php\?title=Special:EditFamilySteps&.*/g) ||
  window.location.href.match(/\/index.php\?title=Special:EditFamily&.*/g)
) {
  isProfileAddRelative = true;
} else if (
  // Profile Page
  window.location.pathname.match(/(\/wiki\/)\w[^:]*-[0-9]*/g) ||
  window.location.href.match(/\/index.php\?title=\w[^:]+-[0-9]+/g)
) {
  isProfilePage = true;
  if ($(".toggleMemberSection").length) {
    // Profile of a User page    
    isProfileUserPage = true;
    if ($("a[href$='/wiki/Special:Genealogist").length) {
      // Profile of a Logged in User page
      isProfileLoggedInUserPage = true;
    }
  }
} else if (
  // Space Edit Page
  window.location.href.match(/\/index.php\?title=Space:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Space:.*&action=submit.*/g)
) {
  isSpaceEdit = true;
} else if (
  // Space Page
  window.location.pathname.match(/\/wiki\/Space:.*/g) ||
  window.location.href.match(/\/index.php\?title=Space:.*/g)
) {
  isSpacePage = true;
} else if (
  // Category Edit Page
  window.location.href.match(/\/index.php\?title=Category:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Category:.*&action=submit.*/g)
) {
  isCategoryEdit = true;
} else if (
  // Category Page
  window.location.pathname.match(/\/wiki\/Category:.*/g) ||
  window.location.href.match(/\/index.php\?title=Category:.*/g)
) {
  isCategoryPage = true;
} else if (
  // Template Edit Page
  window.location.href.match(/\/index.php\?title=Template:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Template:.*&action=submit.*/g)
) {
  isTemplateEdit = true;
} else if (
  // Template Page
  window.location.pathname.match(/\/wiki\/Template:.*/g) ||
  window.location.href.match(/\/index.php\?title=Template:.*/g)
) {
  isTemplatePage = true;
} else if (
  // Help Edit Page
  window.location.href.match(/\/index.php\?title=Help:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=Help:.*&action=submit.*/g)
) {
  isHelpEdit = true;
} else if (
  // Help Page
  window.location.pathname.match(/\/wiki\/Help:.*/g) ||
  window.location.href.match(/\/index.php\?title=Help:.*/g)
) {
  isHelpPage = true;
} else if (
  // Special Page
  window.location.pathname.match(/(\/wiki\/)Special:*/g) ||
  window.location.href.match(/\/index.php\?title=Special:.*/g)
) {
  isSpecialPage = true;
  if (
    // Special Badges Page
    window.location.pathname.match(/(\/wiki\/)Special:Badges*/g) ||
    window.location.href.match(/\/index.php\?title=Special:Badges.*/g)
  ) {
    isSpecialBadges = true;
  } else if (
    // Special Badges Page
    window.location.pathname.match(/(\/wiki\/)Special:MyConnections*/g) ||
    window.location.href.match(/\/index.php\?title=Special:MyConnections.*/g)
  ) {
    isSpecialMyConnections = true;
  } else if (
    // Special Badges Page
    window.location.pathname.match(/(\/wiki\/)Special:DNATests*/g) ||
    window.location.href.match(/\/index.php\?title=Special:DNATests.*/g)
  ) {
    isSpecialDNATests = true;
  } else if (
    // Special Badges Page
    window.location.pathname.match(/(\/wiki\/)Special:WatchedList*/g) ||
    window.location.href.match(/\/index.php\?title=Special:WatchedList.*/g)
  ) {
    isSpecialWatchedList = true;    
  }
} else if (
  // Other Edit Page
  window.location.href.match(/\/index.php\?title=.*:.*&action=edit.*/g) ||
  window.location.href.match(/\/index.php\?title=.*:.*&action=submit.*/g)
) {
  isOtherEdit = true;
} else if (
  // Other Page
  window.location.pathname.match(/(\/wiki\/).*:*/g) ||
  window.location.href.match(/\/index.php\?title=.*:.*/g)
) {
  isOtherPage = true;
} else if (window.location.pathname.match(/\/g2g\//g)) {
  // Is a G2G page
  isG2G = true;
} else {
  // Unknown page
  console.log(window.location.href);
}

isWikiPage = isProfilePage || isSpacePage || isCategoryPage || isTemplatePage || isHelpPage || isOtherPage;
isWikiEdit = isProfileEdit || isSpaceEdit || isCategoryEdit || isTemplateEdit || isHelpEdit || isOtherEdit;

