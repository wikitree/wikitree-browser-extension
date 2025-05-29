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
 * @param {string} opt.returnURL - The URL to return to after login.
 */
export function addLoginButton(opt) {
  const x = window.location.href.split("?");
  if (x[1]) {
    const queryParams = new URLSearchParams(x[1]);
    const authcode = queryParams.get("authcode");
    if (authcode) {
      $.ajax({
        url: "https://api.wikitree.com/api.php",
        crossDomain: true,
        xhrFields: { withCredentials: true },
        type: "POST",
        dataType: "JSON",
        data: {
          action: "clientLogin",
          authcode: authcode,
          appId: opt.appId,
        },
        success: function (data) {
          if (data) {
            if (data.clientLogin.result == "Success") {
              $(`#${opt.btnId}`).hide();
            }
          }
        },
      });
    }
  }
  const userID = getUserNumId();
  isLoggedIntoAPI(userID, opt.appId).then((loggedIn) => {
    if (!loggedIn) {
      let loginButton = $(`#${opt.btnId}`);
      if (!loginButton || loginButton.length == 0) {
        loginButton = $(`<button title="${opt.btnTitle}" class='small button' id="${opt.btnId}">Apps Login</button>`);
        loginButton.appendTo(opt.btnContainer);
      }
      loginButton.off("click").on("click", function (e) {
        e.preventDefault();
        if (opt.btnOnClick) {
          opt.btnOnClick(e);
        }
        window.location =
          "https://api.wikitree.com/api.php?action=clientLogin&appId=" + opt.appId + "&returnURL=" + opt.returnURL;
      });
    }
  });
}
