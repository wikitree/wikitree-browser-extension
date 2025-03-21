document?.documentElement?.removeAttribute("data-wbe-conflict");
import { getUserNumId } from "./core/common";

const loggedInUserId = getUserNumId();

if (!loggedInUserId) {
  console.log("WBE: User not logged in. Extension disabled.");
} else {
  // Initialize your extension
  initializeExtension();
}

function initializeExtension() {
  // Now you can safely import dynamically
  import("./init.js").catch((err) => console.error("Feature load error:", err));
}
