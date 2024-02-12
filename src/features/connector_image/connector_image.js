import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";

shouldInitializeFeature("connectorImage").then((result) => {
  if (result) {
    const name = $("h1 span[itemprop='name']").text().trim();
    const hasCFProfiles = $("div.sixteen.columns a[href*='Special:Connection']").length > 8;
    const hasJigsawMan = $("h1 img[src*='/images/icons/unconnected.png']").length > 0;
    if (!hasCFProfiles && !hasJigsawMan) {
      const jigsawMan = `<a href="https://apps.wikitree.com/apps/nelson3486/connections/index.html?ID=9882358&amp;steps=3" target="_blank" style="margin-right:0.2em">
    <img src="/images/icons/unconnected.png" border="0" width="16" height="20" alt="unconnected" title="${name} is not connected to our global tree; click to see missing links"></a>`;
      $(`h1 button[aria-label="Copy ID"]`).before(jigsawMan);
    }
  }
});
