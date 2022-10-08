chrome.storage.sync.get("darkMode", (result) => {
  if (result.darkMode) {
    $("body").addClass("darkMode");
    $("img[src*='wikitree-logo.png']").attr(
      "src",
      chrome.runtime.getURL("images/wikitree-logo-white.png")
    );
    $("img[src*='wikitree-small.png']").attr(
      "src",
      chrome.runtime.getURL("images/wikitree-logo-small-white.png")
    );
    $("img[src*='Wiki-Tree.gif']").attr(
      "src",
      chrome.runtime.getURL("images/Wiki-Tree-white.png")
    );
    $("img[src*='G2G.gif']").attr(
      "src",
      chrome.runtime.getURL("images/G2G-transparent.png")
    );
    $("h1:contains(Connection Finder)").parent().css("background-image", "");
    $("body.darkMode.page-Main_Page div.sixteen.columns.top").css(
      "background-image",
      "url(" + chrome.runtime.getURL("images/tree-white.png") + ")"
    );
  }
});
