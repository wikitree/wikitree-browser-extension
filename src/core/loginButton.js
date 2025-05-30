import $ from "jquery";
import { getUserNumId, isLoggedIntoAPI } from "./common";

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
  console.log(`returnUrl=${returnURL}`);

  await handleOptionalAuthCode(opt);

  const userID = getUserNumId();
  isLoggedIntoAPI(userID, opt.appId).then((loggedIn) => {
    if (!loggedIn) {
      let loginButton = $(`#${opt.btnId}`);
      if (!loginButton || loginButton.length == 0) {
        loginButton = $(
          `<button title="${opt.btnTitle}" class='small button wbe-app-login' id="${opt.btnId}">Apps Login</button>`
        );
        loginButton.appendTo(opt.btnContainer);
      }
      loginButton.off("click").on("click", function (e) {
        e.preventDefault();
        if (opt.btnOnClick) {
          opt.btnOnClick(e);
        }
        console.log(`returnUrl=${returnURL}`);
        window.location = `https://api.wikitree.com/api.php?action=clientLogin&appId=${opt.appId}&returnURL=${returnURL}`;
      });
    } else {
      $(`#${opt.btnId}`).hide();
    }
  });
}

async function handleOptionalAuthCode(opt) {
  const x = window.location.href.split("?");
  if (!x[1]) return;

  const queryParams = new URLSearchParams(x[1]);
  const authcode = queryParams.get("authcode");
  if (!authcode) return;

  // console.log("clientLogin with Auth code:", authcode);
  try {
    const response = await fetch("https://api.wikitree.com/api.php", {
      method: "POST",
      credentials: "include", // includes cookies for cross-domain requests
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        action: "clientLogin",
        authcode: authcode,
        appId: opt.appId,
      }),
    });

    const data = await response.json();

    if (data?.clientLogin?.result === "Success") {
      $(`#${opt.btnId}`).hide();
    } else {
      // console.error(`Login with auth code ${authcode} failed:`, data);
    }
  } catch (error) {
    console.error(`Login with auth code ${authcode} failed:`, error);
  }
}

export function currentHrefWithoutAuthcode() {
  const url = new URL(window.location.href);
  url.searchParams.delete("authcode");
  return encodeURI(url.origin + url.pathname + url.search + url.hash);
}
