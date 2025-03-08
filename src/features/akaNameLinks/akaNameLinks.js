/*
Created By: Ian Beacall (Beacall-6)
*/

import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { mainDomain } from "../../core/pageType";

async function akaNames() {
  // Ensure we are on a profile page
  if ($("body.profile").length) {
    const vitalsSection = document.querySelector("#familyVitals p.VITALS");
    if (!vitalsSection) {
      return;
    }

    if (vitalsSection) {
      let nodes = vitalsSection.childNodes;

      for (let i = 0; i < nodes.length; i++) {
        let node = nodes[i];

        // Check if it's a text node containing 'aka'
        if (node.nodeType === 3 && node.nodeValue.trim() === "aka") {
          let akaStrong = nodes[i + 1]; // The next sibling node (should be <strong>)

          if (akaStrong && akaStrong.tagName == "STRONG") {
            let akaText = akaStrong.textContent.trim();
            if (akaText) {
              let akaNames = akaText.split(/\s*,\s*/); // Split multiple names by commas

              akaStrong.innerHTML = ""; // Clear the existing text

              akaNames.forEach((akaName, index) => {
                let link = document.createElement("a");
                link.href = `https://${mainDomain}/genealogy/${akaName}`;
                link.textContent = akaName.trim();
                akaStrong.appendChild(link);

                if (index + 1 < akaNames.length) {
                  akaStrong.appendChild(document.createTextNode(", "));
                }
              });
            }
          }
        }
      }
    } else {
      console.log("Vitals section not found");
    }
  }
}

shouldInitializeFeature("akaNameLinks").then((result) => {
  if (result) {
    akaNames();
  }
});
