import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { profilePerson } from "../sort_theme_people/sort_theme_people.js";

shouldInitializeFeature("connectorImage").then((result) => {
  if (result) {
    const name = profilePerson.FullName;
    const hasCFProfiles = $("div.sixteen.columns a[href*='Special:Connection']").length > 8;
    const hasJigsawMan = $("h1 span.icon--unconnected").length > 0;
    const id = profilePerson.Name;
    if (!hasCFProfiles && !hasJigsawMan) {
      const jigsawMan = $(
        `<a id="jigsawMan" href="https://apps.wikitree.com/apps/nelson3486/connections/index.html?ID=${id}&steps=3" target="_blank" title="${name} is not connected to our global tree; click to see missing links"><span class="icon--unconnected"></span></a>`
      );
      $(`h1 small.lifespan`).after(jigsawMan);
      jigsawMan.css({ "margin-left": "1em" });
    }
  }
});
