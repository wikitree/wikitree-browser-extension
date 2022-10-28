import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage.js";
import { updateLink } from "./redir_ext_link.js";

async function updateAllLinks() {
  const options = await getFeatureOptions("redirExtLinks");

  // get all link (anchor) elements within the content area that start with "http"
  // this should get all the external links that we want
  let allLinks = document.querySelectorAll("#content a[href^='http']");

  for (let link of allLinks) {
    let href = link.getAttribute("href");
    let newLink = updateLink(href, options);

    // updateLink will return undefined if no change is needed
    if (newLink) {
      link.setAttribute("href", newLink);
    }
  }
}

checkIfFeatureEnabled("redirExtLinks").then((result) => {
  if (result) {
    updateAllLinks();
  }
});
