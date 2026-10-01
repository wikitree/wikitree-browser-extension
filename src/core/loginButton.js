import $ from "jquery";
import { getUserNumId } from "./common";
import { WikiTreeAPI } from "./API/WikiTreeAPI";

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
        loginButton = $(
          `<button title="${opt.btnTitle}" class='small button wbe-app-login wbe-button' id="${opt.btnId}">Apps Login</button>`
        );
        loginButton.appendTo(opt.btnContainer);
      }
      loginButton.off("click").on("click", function (e) {
        e.preventDefault();
        if (opt.btnOnClick) {
          opt.btnOnClick(e);
        }
        window.location = `https://api.wikitree.com/api.php?action=clientLogin&appId=${opt.appId}&returnURL=${returnURL}`;
      });
    } else {
      $(`#${opt.btnId}`).hide();
    }
  });
}

async function handleOptionalAuthCode(opt) {
  if (await redeemAuthcode(opt.appId)) {
    $(`#${opt.btnId}`).hide();
  }
}

let authcodeRedemption = null;

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
