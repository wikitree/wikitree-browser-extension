/*
Created By: Aleš Trtnik (Trtnik-2)
*/

import $ from "jquery";

// Wiki domain variables
// apps.wikitree.com
export let isAppsDomain = false;
// api.wikitree.com
export let isApiDomain = false;
// plus.wikitree.com
export let isPlusDomain = false;
// *.wikitree.com
export let isMainDomain = false;

// Wiki Page variables
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
// MediaWiki page
export let isMediaWikiPage = false;
// Category page
export let isCategoryPage = false;
// Template page
export let isTemplatePage = false;
// Project page
export let isProjectPage = false;
// Help page
export let isHelpPage = false;
// Genealogy page
export let isGenealogyPage = false;
// Nav Home Page
export let isNavHomePage = false;
// Other wiki page (Project:, Docs:, Automated:, ...)
export let isOtherPage = false;

// Wiki Edit Page variables
// Any Edit page with pageID
export let isWikiEdit = false;
// Profile edit page
export let isProfileEdit = false;
// Profile add relative
export let isProfileAddRelative = false;
// Add unrelated person
export let isAddUnrelatedPerson = false;
// New Space page
export let isNewSpace = false;
// Space edit page
export let isSpaceEdit = false;
// MediaWiki edit page
export let isMediaWikiEdit = false;
// Category edit page
export let isCategoryEdit = false;
// Template edit page
export let isTemplateEdit = false;
// Project edit page
export let isProjectEdit = false;
// Help edit page
export let isHelpEdit = false;
// Other wiki edit page (Project:, Docs:, Automated:, ...)
export let isOtherEdit = false;

// Wiki Page Change History variables
// Any History page
export let isWikiHistory = false;
// Profile History page
export let isProfileHistory = false;
// Profile History page
export let isActivityFeed = false;
// Profile History Detail page
export let isProfileHistoryDetail = false;
// Space History page
export let isSpaceHistory = false;
// MediaWiki History page
export let isMediaWikiHistory = false;
// Category History page
export let isCategoryHistory = false;
// Template History page
export let isTemplateHistory = false;
// Project History page
export let isProjectHistory = false;
// Help History page
export let isHelpHistory = false;
// Other wiki History page (Project:, Docs:, Automated:, ...)
export let isOtherHistory = false;

// Special: page
export let isSpecialPage = false;
// Special: Anniversaries page
export let isSpecialAnniversaries = false;
// Special: Badges page
export let isSpecialBadges = false;
// Special: MyConnections page
export let isSpecialMyConnections = false;
// Special: DNATests page
export let isSpecialDNATests = false;
// DNADescendants page
export let isDNADescendants = false;
// Special: WatchedList page
export let isSpecialWatchedList = false;
// MergeEdit
export let isMergeEdit = false;

// G2G
export let isG2G = false;
// Apps page
export let isAppsPage = false;
// Special:SearchPerson
export let isSearchPage = false;
// Special:Connection
export let isConnectionFinder = false;
// Ian's Profile
export let isIansProfile = false;
// Upload Photo (index.php?title=Special:UploadPhoto)
export let isUploadPhoto = false;

// Special:NetworkFeed
export let isNetworkFeed = false;

// WikiTree Plus variables
// Profile Search results
export let isPlusProfileSearch = false;

const domain = decodeURI(window.location.hostname); // path

if (window.location.href.match("Special:NetworkFeed")) {
  isNetworkFeed = true;
}
// log
console.log("domain: " + domain);

if (domain.match("apps.wikitree.com")) {
  isAppsDomain = true;
} else if (domain.match("api.wikitree.com")) {
  isApiDomain = true;
} else if (domain.match("plus.wikitree.com")) {
  isPlusDomain = true;

  const path = decodeURI(window.location.pathname); // path
  if (
    // Profile Search result
    path.match(/\/(function|f)\/(WTWebProfileSearch|WTWebProfileSearchTree|)\/.*\.htm/gi)
  ) {
    isPlusProfileSearch = true;
  } 
} else {
  isMainDomain = true;

  const path = decodeURI(window.location.pathname); // path
  const uri = decodeURI(window.location.href); // with parameters
  if (
    // Profile Edit Page
    uri.match(/\/index.php\?title=Special:EditPerson&.*/g)
  ) {
    isProfileEdit = true;
  } else if (
    // Profile Add relative
    uri.match(/\/index.php\?title=Special:EditFamilySteps&.*/g) ||
    uri.match(/\/index.php\?.*title=Special(:|%3A)EditFamily&.*/g)
  ) {
    isProfileAddRelative = true;
  } else if (
    // Add Unrelated Person
    uri.match(/\/wiki\/Special:EditFamily/g)
  ) {
    isAddUnrelatedPerson = true;
  } else if (
    // Profile History Page https://www.wikitree.com/index.php?title=Special:NetworkFeed&who=Trtnik-2
    uri.match(/\/index.php\?title=Special:NetworkFeed&who=.*/g) ||
    uri.match(/\/index.php\?title=Special:NetworkFeed&surname=.*/g)
  ) {
    if (uri.match(/watchlist|ancestors|descendants|connections|followed|surname/)) {
      isActivityFeed = true;
    } else {
      isProfileHistory = true;
    }
  } else if (uri.match(/index.php\?title=Special:UploadPhoto/)) {
    isUploadPhoto = true;
  } else if (
    // Profile History Detail Page https://www.wikitree.com/index.php?title=Morgan-14024&diff=53223025&oldid=53223019
    // or https://www.wikitree.com/index.php?title=Morgan-14024&diff=next&oldid=53223019
    // or Page https://www.wikitree.com/index.php?title=Morgan-14024&diff=prev&oldid=53223019
    uri.match(/\/index.php\?title=\p{L}[^:]*-[0-9]+&diff=(\d*|next|prev)&oldid=\d*/gu)
  ) {
    isProfileHistoryDetail = true;
  } else if (
    // Profile Page
    path.match(/(\/wiki\/)\p{L}[^:]*-[0-9]+/gu) ||
    (uri.match(/\/index.php\?title=\p{L}[^:]*-[0-9]+/gu) &&
      !uri.match(/\/index.php\?title=(Special|Space|Category|Template|Help|Project)/g))
  ) {
    isProfilePage = true;
    if ($(".toggleMemberSection").length) {
      // Profile of a User page
      isProfileUserPage = true;
      if ($("a[href$='/wiki/Special:Genealogist").length) {
        // Profile of a Logged in User page
        isProfileLoggedInUserPage = true;
      }
      if (uri.match("https://www.wikitree.com/wiki/Beacall-6")) {
        // Ian's Profile
        isIansProfile = true;
      }
    }
  } else if (
    // Space Edit Page
    uri.match(/\/index.php\?title=Space:.*&action=edit.*/g) ||
    uri.match(/\/index.php\?title=Space:.*&action=submit.*/g)
  ) {
    isSpaceEdit = true;
  } else if (
    // Space Page
    path.match(/\/wiki\/Space:.*/g) ||
    uri.match(/\/index.php\?title=Space:.*/g)
  ) {
    isSpacePage = true;
  } else if (
    // Space History Page https://www.wikitree.com/index.php?title=Special:NetworkFeed&space=41770011
    uri.match(/\/index.php\?title=Special:NetworkFeed&space=.*/g)
  ) {
    isSpaceHistory = true;
  } else if (uri.match(/index.php\?action=newspace/)) {
    // New space page
    isNewSpace = true;
  } else if (
    // Category Edit Page
    uri.match(/\/index.php\?title=Category:.*&action=edit.*/g) ||
    uri.match(/\/index.php\?title=Category:.*&action=submit.*/g)
  ) {
    isCategoryEdit = true;
  } else if (
    // Category History Page https://www.wikitree.com/index.php?title=Project:Data%20Doctors&action=history
    uri.match(/\/index.php\?title=Category:.*&action=history/g)
  ) {
    isCategoryHistory = true;
  } else if (
    // Category Page without action
    path.match(/\/wiki\/Category:.*/g) ||
    uri.match(/\/index.php\?title=Category:.*/g)
  ) {
    isCategoryPage = true;
  } else if (
    // Template Edit Page
    uri.match(/\/index.php\?title=Template:.*&action=edit.*/g) ||
    uri.match(/\/index.php\?title=Template:.*&action=submit.*/g)
  ) {
    isTemplateEdit = true;
  } else if (
    // Template Page
    path.match(/\/wiki\/Template:.*/g) ||
    uri.match(/\/index.php\?title=Template:.*/g)
  ) {
    isTemplatePage = true;
  } else if (
    // Template History Page https://www.wikitree.com/index.php?title=Template:Data%20Doctors&action=history
    uri.match(/\/index.php\?title=Template:.*&action=history/g)
  ) {
    isTemplateHistory = true;
  } else if (
    // Project Edit Page
    uri.match(/\/index.php\?title=Project:.*&action=edit.*/g) ||
    uri.match(/\/index.php\?title=Project:.*&action=submit.*/g)
  ) {
    isProjectEdit = true;
  } else if (
    // Project Page
    path.match(/\/wiki\/Project:.*/g) ||
    uri.match(/\/index.php\?title=Project:.*/g)
  ) {
    isProjectPage = true;
  } else if (
    // Project History Page https://www.wikitree.com/index.php?title=Project:Data%20Doctors&action=history
    uri.match(/\/index.php\?title=Project:.*&action=history/g)
  ) {
    isProjectHistory = true;
  } else if (
    // Help Edit Page
    uri.match(/\/index.php\?title=Help:.*&action=edit.*/g) ||
    uri.match(/\/index.php\?title=Help:.*&action=submit.*/g)
  ) {
    isHelpEdit = true;
  } else if (
    // Help Page
    path.match(/\/wiki\/Help:.*/g) ||
    uri.match(/\/index.php\?title=Help:.*/g)
  ) {
    isHelpPage = true;
  } else if (
    // Help History Page https://www.wikitree.com/index.php?title=Help:Data%20Doctors&action=history
    uri.match(/\/index.php\?title=Help:.*&action=history/g)
  ) {
    isHelpHistory = true;
  } else if (
    // Special Page
    path.match(/(\/wiki\/)Special:*/g) ||
    uri.match(/\/index.php\?title=Special.*/g)
  ) {
    isSpecialPage = true;
    if (
      // Special Anniversaries Page
      path.match(/(\/wiki\/)Special:Anniversaries*/g) ||
      uri.match(/\/index.php\?title=Special:Anniversaries.*/g)
    ) {
      isSpecialAnniversaries = true;
    } else if (
      // Special Badges Page
      path.match(/(\/wiki\/)Special:Badges*/g) ||
      uri.match(/\/index.php\?title=Special:Badges.*/g)
    ) {
      isSpecialBadges = true;
    } else if (
      // Special My Connections
      path.match(/(\/wiki\/)Special:MyConnections*/g) ||
      uri.match(/\/index.php\?title=Special.*?MyConnections.*/g)
    ) {
      isSpecialMyConnections = true;
    } else if (
      // Special DNA Tests
      path.match(/(\/wiki\/)Special:DNATests*/g) ||
      uri.match(/\/index.php\?title=Special:DNATests.*/g)
    ) {
      isSpecialDNATests = true;
    } else if (
      // Special Watched List
      path.match(/(\/wiki\/)Special:WatchedList*/g) ||
      uri.match(/\/index.php\?title=Special:WatchedList.*/g)
    ) {
      isSpecialWatchedList = true;
    } else if (uri.match(/\/Special:SearchPerson/g)) {
      // Special:SearchPerson
      isSearchPage = true;
    } else if (uri.match(/Special:Surname/)) {
      isGenealogyPage = true;
    } else if (uri.match(/Special:Home/)) {
      isNavHomePage = true;
    } else if (uri.match(/Special:Connection/)) {
      isConnectionFinder = true;
    } else if (uri.match(/Special:MergeEdit/)) {
      isMergeEdit = true;
    }
  } else if (
    // Other Edit Page
    uri.match(/\/index.php\?title=.*:.*&action=edit.*/g) ||
    uri.match(/\/index.php\?title=.*:.*&action=submit.*/g)
  ) {
    isOtherEdit = true;
  } else if (
    // Other History Page https://www.wikitree.com/index.php?title=...:Data%20Doctors&action=history
    uri.match(/\/index.php\?title=.*:.*&action=history/g)
  ) {
    isOtherHistory = true;
  } else if (uri.match(/\/genealogy\//)) {
    // genealogy page
    isGenealogyPage = true;
  } else if (
    // Other Page
    path.match(/(\/wiki\/).*:*/g) ||
    uri.match(/\/index.php\?title=.*:.*/g)
  ) {
    isOtherPage = true;
  } else if (path.match(/\/g2g\//g)) {
    // Is a G2G page
    isG2G = true;
  } else if (uri.match(/\/treewidget\/.*?\/890/g)) {
    // DNADescendantsPage
    isDNADescendants = true;
  } else if (uri.match(/\/apps\//)) {
    // Is an apps page (hosted on WikiTree in the /apps/ folder like Tree Apps)
    isAppsPage = true;
  } else {
    // Unknown page
    console.log(uri);
  }

  isMediaWikiPage = isCategoryPage || isTemplatePage || isProjectPage || isHelpPage || isOtherPage;
  isWikiPage = isProfilePage || isSpacePage || isMediaWikiPage;
  isMediaWikiEdit = isCategoryEdit || isTemplateEdit || isProjectEdit || isHelpEdit || isOtherEdit;
  isWikiEdit = isProfileEdit || isSpaceEdit || isMediaWikiEdit;
  isMediaWikiHistory = isCategoryHistory || isTemplateHistory || isProjectHistory || isHelpHistory || isOtherHistory;
  isWikiHistory = isProfileHistory || isSpaceHistory || isMediaWikiHistory;
}
