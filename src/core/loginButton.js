import $ from "jquery";
import { getUserNumId } from "./common";
import { WikiTreeAPI } from "./API/WikiTreeAPI";

// The key on the green "Apps" pill (styled in common.css). It takes the text colour, so it matches the label.
const KEY_ICON =
  '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.2" ' +
  'stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="15" r="4.5"/>' +
  '<path d="M11.2 11.8 20 3M16.5 6.5l2.5 2.5M14 9l2 2"/></svg>';

/**
 * Function to add a login button for the WikiTree Apps server.
 * @param {Object} opt - Options for the login button.
 * @param {string} opt.appId - The application ID to use in the call to the WikiTree Apps server.
 * @param {string} opt.btnId - The ID for the login button.
 * @param {string} opt.btnTitle - The title (tooltip) for the login button.
 * @param {string} opt.btnContainer - The jQuery selector for the container to which append the button.
 * @param {Function} [opt.btnOnClick] - Optional additional functionality to execute when the button is
 *                   clicked and before the user is redirected to the API login page.
 * @param {string} [opt.returnURL] - Optional URL to return to after login. If not suppplied, the current
 *                   URL will be used minus any authcode parameter.
 */
export async function addLoginButton(opt) {
  const returnURL = opt.returnURL ? opt.returnURL : currentHrefWithoutAuthcode();

  await handleOptionalAuthCode(opt);

  const userID = getUserNumId();
  WikiTreeAPI.isLoggedIntoAPI(userID, opt.appId).then((loggedIn) => {
    if (!loggedIn) {
      let loginButton = $(`#${opt.btnId}`);
      if (!loginButton || loginButton.length == 0) {
        loginButton = appsLoginPill(opt.btnTitle).attr("id", opt.btnId);
        loginButton.appendTo(opt.btnContainer);
      }
      loginButton.off("click").on("click", function (e) {
        e.preventDefault();
        if (opt.btnOnClick) {
          opt.btnOnClick(e);
        }
        goToAppsLogin(opt.appId, returnURL);
      });
    } else {
      $(`#${opt.btnId}`).hide();
    }
  });
}

/** The green "Apps" pill with a key, with no click handler yet. */
function appsLoginPill(title) {
  return $(
    `<button title="${title}" aria-label="Apps Login" class='small button wbe-app-login wbe-button'>${KEY_ICON}Apps</button>`
  );
}

/** Off to api.wikitree.com to log in, coming back to returnURL (by default this page). */
function goToAppsLogin(appId, returnURL = currentHrefWithoutAuthcode()) {
  window.location = `https://api.wikitree.com/api.php?action=clientLogin&appId=${appId}&returnURL=${returnURL}`;
}

/**
 * A working Apps Login pill to put anywhere, such as in a Chat message, for when the one on the page is out of sight
 * or not there at all. It has no id, so there can be more than one.
 * @param {string} appId - The application ID to use in the call to the WikiTree Apps server.
 * @param {string} title - The title (tooltip) for the button.
 */
export function createAppsLoginButton(appId, title) {
  return appsLoginPill(title).on("click", (e) => {
    e.preventDefault();
    goToAppsLogin(appId);
  });
}

async function handleOptionalAuthCode(opt) {
  if (await redeemAuthcode(opt.appId)) {
    $(`#${opt.btnId}`).hide();
  }
}

let authcodeRedemption = null;
// Whether the page was opened with an authcode, remembered because the code is taken out of the
// address bar once it has been used (see removeAuthcodeFromUrl).
const arrivedWithAuthcode = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("authcode");

/** True if this page was opened straight back from api.wikitree.com's clientLogin (with an authcode). */
export function pageHadAuthcode() {
  return arrivedWithAuthcode;
}

/**
 * Takes the used authcode out of the address bar. An authcode works only once; left there, every
 * reload sent it again (and the API login didn't stay, 2026-10-03, on staging).
 */
function removeAuthcodeFromUrl() {
  try {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("authcode")) return;
    url.searchParams.delete("authcode");
    window.history.replaceState(window.history.state, "", url.href);
  } catch (error) {
    // (no history API: the code just stays in the URL, as before)
  }
}

/**
 * If the page URL carries an authcode (we've just come back from api.wikitree.com's clientLogin),
 * exchange it for an API session. An authcode can only be used once, and several features may want
 * to do this on the same page, so the exchange happens at most once per page and everyone awaits the
 * same promise. Anything that checks API login status on a page that may have an authcode should
 * await this first, otherwise it can cache a "not logged in" answer before the exchange completes.
 * @param {string} appId - The application ID to use in the call.
 * @returns {Promise<boolean>} true if an authcode was present and the login succeeded.
 */
export function redeemAuthcode(appId) {
  if (!authcodeRedemption) {
    authcodeRedemption = doRedeemAuthcode(appId);
  }
  return authcodeRedemption;
}

async function doRedeemAuthcode(appId) {
  const authcode = new URLSearchParams(window.location.search).get("authcode");
  if (!authcode) return false;

  const userNumId = getUserNumId();
  try {
    const data = await WikiTreeAPI.postToAPI({ action: "clientLogin", authcode: authcode, appId: appId });
    removeAuthcodeFromUrl();
    if (data?.clientLogin?.result === "Success") {
      WikiTreeAPI.setCachedApiLoginStatus(userNumId, true);
      return true;
    }
  } catch (error) {
    console.error(`Login with auth code ${authcode} failed:`, error);
  }
  // A status check may have been cached while the exchange was in flight; make the next one ask again.
  WikiTreeAPI.clearCachedApiLoginStatus(userNumId);
  return false;
}

export function currentHrefWithoutAuthcode() {
  const url = new URL(window.location.href);
  url.searchParams.delete("authcode");
  return encodeURI(url.origin + url.pathname + url.search + url.hash);
}
