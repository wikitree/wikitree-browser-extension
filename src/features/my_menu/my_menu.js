import $ from "jquery";
import "jquery-ui/ui/widgets/sortable";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";
import { isOK, htmlEntities, getRandomProfile, showDraftList } from "../../core/common";
import "./my_menu.css";

checkIfFeatureEnabled("myMenu").then((result) => {
  if (result && $("body.BEE").length == 0) {
    addCustomMenu();
  }
});

// My Menu functions

function addTypeOfSuggestion() {
  setTimeout(function () {
    $("#customMenu li[data-menu='My_WikiTree'] a:contains(Suggestions)").each(function () {
      if ($(this).find(".addedText").length == 0) {
        $(this).append($("<added class='addedText'>WL</added>"));
      }
    });
    $("#customMenu li[data-menu!='My_WikiTree'] a:contains(Suggestions)").each(function () {
      if ($(this).find(".addedText").length == 0) {
        $(this).append($("<added class='addedText'>A</added>"));
      }
    });
  }, 200);
}

function addCustomMenuOptions() {
  $("#customMenuOptions").remove();
  const subMenus = [];
  $(".subMenu").each(function () {
    const listTitle = $(this).prev().clone();
    const listTitleText = listTitle.text();
    const theBigLi = $("<li></li>");
    theBigLi.append(listTitle);
    const theList = $("<ul id='" + listTitleText + "_Menu'></ul>");
    const theListAs = $(this).find("a");
    theListAs.each(function () {
      let anLi = $("<li date-menu='" + listTitle.text() + "'></li>");
      anLi.append($(this));
      theList.append(anLi);
    });
    theBigLi.append(theList);
    subMenus.push(theBigLi);
  });
  const customMenuOptions = $("<div id='customMenuOptions'><x>x</x></div>");
  customMenuOptions.appendTo($("body"));
  const menuClone = $("ul.pureCssMenu:contains(My WikiTree)").clone();
  menuClone.attr("id", "menuClone");
  menuClone.appendTo(customMenuOptions);
  subMenus.forEach(function (aMenu) {
    menuClone.append(aMenu);
  });
  menuClone.removeClass("pureCssMenum").removeClass("pureCssMenu");
  menuClone.find("> li > ul").each(function (index) {
    $(this).attr("id", $(this).closest("li").find(">a").text().replace(" ", "_") + "_Menu");
    let menuName = $(this).closest("li").find(">a").text().replace(" ", "_");
    if (menuName.match(/\-[0-9]+$/) != null) {
      menuName = "Profile";
      $(this).closest("li").find(">a").text("Profile");
    }
    $(this).find("li").attr("data-menu", menuName);
    if ($("#HEADER").length) {
      $(this).find("li").attr("data-g2gmenu", index);
    }
  });
  $("#menuClone menu").remove();

  let customMenu = $("<div id='customMenuContainer'><label>My Menu</label><ul id='customMenu'></ul></div>");
  const customMenuInfo = $(
    "<ul id='customMenuInfo'><li>Click a link to add it to (or remove it from) the custom menu ('My Menu').</li><li>Re-order the menu by dragging the links.</li></ul>"
  );
  customMenuOptions.prepend(customMenuInfo);
  customMenu.prependTo(customMenuOptions);
  $("#customMenuOptions x").on("click", function () {
    $(this).parent().slideToggle();
    addCustomMenu();
  });
  let mCustomMenu = "";
  if (localStorage.customMenu) {
    mCustomMenu = localStorage.customMenu;
  }
  if (isOK(mCustomMenu)) {
    const storedCustomMenu = JSON.parse(mCustomMenu);
    storedCustomMenu.arr.forEach(function (aLink) {
      let anLi = $("<li data-menu='" + aLink.Menu + "'><a href='" + aLink.Link + "'>" + aLink.LinkText + "</a></li>");
      $("#customMenu").append(anLi);
      anLi.find("a").on("click", function () {
        returnToMenu($(this).parent());
        return false;
      });
    });
  }
  $("#menuClone a,#customMenu a").each(function () {
    $(this)[0].onclick = "";
  });
  $("#menuClone a,#customMenu a").on("click", function (e) {
    e.preventDefault();
  });

  $("#menuClone li ul li,#customMenu li").on("click", function (e) {
    e.preventDefault();
    addToCustomMenu($(this));
  });

  $("#customMenu").sortable({
    update: function (event, ui) {
      storeCustomMenu();
    },
  });

  const addLinkForm = $(
    "<form id='addLinkForm'><label>Add any link:<input type='text' id='anyLinkLink'></label><label>Link text:<input type='text' id='anyLinkText'></label><button id='addLinkFormButton' class='small button'>Go</button></form>"
  );
  $("#customMenuContainer").append(addLinkForm);
  $("#addLinkFormButton").on("click", function (e) {
    e.preventDefault();
    const regex = /[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;

    if ($("#anyLinkLink").val().match(regex) != null && $("#anyLinkText").val() != "") {
      const theLink = $("#anyLinkLink").val();
      if (
        $("#anyLinkLink")
          .val()
          .match(/^https:\/\//) == null
      ) {
        theLink = "https://" + theLink;
      }
      let linkText = htmlEntities($("#anyLinkText").val());

      const anyLi = $(
        '<li data-menu="AnyLink" class="ui-sortable-handle"><a href="' + theLink + '">' + linkText + "</a></li>"
      );
      anyLi.on("click", function (e) {
        e.preventDefault();
        remove($(this));
      });
      $("#anyLinkLink").val("");
      $("#anyLinkText").val("");
      anyLi.appendTo($("#customMenu"));
      storeCustomMenu();
    } else {
      if ($("#anyLinkLink").val().match(regex) == null) {
        $("#addLinkForm").append($("<span class='checkAnyLink'>Please check your link.</span>"));
      }
      if ($("#anyLinkText").val() == "") {
        $("#addLinkForm").append($("<span class='checkAnyLink'>Please add some link text.</span>"));
      }
      setTimeout(function () {
        $(".checkAnyLink").fadeOut();
      }, 5000);
    }
  });

  const numberOnes = ["Thank-Yous:", "Contributions:", "Badges:"];
  numberOnes.forEach(function (word) {
    const numLink = $("#customMenu a:contains(" + word + ")");
    if (numLink.length) {
      let numLink2 = $(".pureCssMenu")
        .eq(0)
        .find("a:contains(" + word + ")");
      const numMatchy = numLink2.text().match(/[0-9]+/);
      if (numMatchy != null) {
        numLink.text(word + " " + numMatchy[0]);
      }
    }
  });
}

function addCustomMenu() {
  $(".pureCssMenu ul").each(function () {
    let menuTitle = $(this).prev().text().replace(" ", "_");
    if (menuTitle.match(/\-[0-9]+$/) != null) {
      menuTitle = "Profile";
    }
    $(this).attr("data-menu", menuTitle);
  });

  $("#myCustomMenuContainer").remove();
  const outNow = $(
    "<ul id='myCustomMenuContainer' class='pureCssMenu pureCssMenum'><li><a class='pureCssMenui' id='myMenuLink'>My Menu</a><ul id='myCustomMenu' class='pureCssMenum'></ul></li></ul>"
  );
  $("div.sixteen.columns.full-width.header,div#HEADER >div").append(outNow);
  if ($("body.page-Main_Page").length) {
    outNow.insertAfter($(".pureCssMenu").eq(0));
  }
  let mCustomMenu = "";

  if (localStorage.customMenu) {
    mCustomMenu = localStorage.customMenu;
  }
  if (isOK(mCustomMenu)) {
    const storedCustomMenu = JSON.parse(mCustomMenu);
    storedCustomMenu.arr.forEach(function (aLink) {
      let dText = aLink.LinkText;
      let newLink = "";
      let newLinkHREF = "";
      let newLinkText = "";
      if (isOK(aLink.Menu)) {
        if (aLink.Menu.match(/\-[0-9]+$/) != null || aLink.Menu == "Profile") {
          const sameOne = $(".pureCssMenum[data-menu='Profile']")
            .contents()
            .filter(function () {
              return this.textContent == dText;
            });
          newLinkHREF = sameOne.find("a").attr("href");
          aLink.Menu = "Profile";
        }
      }
      const numMatch = dText.match(/^(Contributions)|(Badges)|(Thank-Yous)/);
      if (numMatch != null) {
        dText = numMatch[0];
      }

      const findLink = $(
        "div.sixteen.columns.full-width.header ul.pureCssMenu li ul li:contains('" +
          dText.replace('"', "$quot;") +
          "'),div#HEADER  ul.pureCssMenu li ul li:contains('" +
          dText.replace('"', "$quot;") +
          "'),body.page-Main_Page  ul.pureCssMenu li ul li:contains('" +
          dText.replace('"', "$quot;") +
          "')"
      );

      if (newLinkHREF == "") {
        findLink.each(function () {
          if (newLink == "") {
            if (dText.match(/^Contributions/) != null) {
              if ($(this).text() != "Surname Contributions") {
                newLinkText = $(this).find("a").text();
                newLinkHREF = $(this).find("a").attr("href");
              }
            } else if (findLink.text() == aLink.LinkText) {
              newLinkHREF = $(this).find("a").attr("href");
            } else if (numMatch != null) {
              newLinkText = $(this).find("a").text();
              newLinkHREF = $(this).find("a").attr("href");
            }
          }
        });
      }
      if (newLink == "" || aLink.LinkText == "Suggestions") {
        let dLink = "";

        if (newLinkHREF != "") {
          dLink = newLinkHREF;
        } else {
          dLink = aLink.Link;
        }
        let dLinkText = "";
        if (newLinkText != "") {
          dLinkText = newLinkText;
        } else {
          dLinkText = aLink.LinkText;
        }

        newLink = $(
          "<li data-menu='" + aLink.Menu + "'><a class='pureCssMenui0' href='" + dLink + "'>" + dLinkText + "</a></li>"
        );
      }
      $("#myCustomMenu").append(newLink);
    });
  }
  $("#myMenuLink").on("click", function () {
    let toggleIt = true;
    if ($("#customMenuOptions").css("display") == "block") {
      $("#customMenuOptions").slideToggle();
    } else {
      addCustomMenuOptions();
      $("#customMenuOptions").slideToggle();
    }
    addCustomMenu();
  });

  $("#myMenuLink").on("hover", function () {
    if ($("#myCustomMenu li").length == 0 && !window.menuHovered) {
      window.menuHovered == true;
    }
  });

  $("#myCustomMenu li a:contains(Random Profile)").on("click", function (e) {
    e.preventDefault();
    getRandomProfile();
  });

  $("#myCustomMenu li a:contains(Drafts)").on("click", function (e) {
    e.preventDefault();
    showDraftList();
  });
}

async function storeCustomMenu() {
  const arr = [];
  $("#customMenu a").each(function () {
    const menuName = $(this).parent().data("menu");
    if (menuName.match(/\-[0-9]+$/) != null) {
      menuName = "Profile";
    }
    const theText = $(this)
      .text()
      .replace(/Suggestions.*?\b/, "Suggestions")
      .replace(/^Contributions.*?\b/, "Contributions")
      .replace(/Badges.*?\b/, "Badges")
      .replace(/Thank\-Yous.*?/, "Thank-Yous");
    arr.push({ Link: $(this).attr("href"), LinkText: theText, Menu: menuName });
  });
  const myCustomMenu = { arr };
  const toStore = JSON.stringify(myCustomMenu);
  localStorage.setItem("customMenu", toStore);
  const storedCustomMenu = JSON.parse(localStorage.customMenu);

  $("#customMenu li a").on("click", function () {
    $(this)
      .find("a")
      .each(function () {
        returnToMenu($(this).parent());
        return false;
      });
  });
}

function sortMenu(dMenu) {
  const rows = dMenu.find("li");
  rows.sort(function (a, b) {
    return $(a).text().localeCompare($(b).text());
  });
  rows.appendTo(dMenu);
}

function returnToMenu(jq) {
  let dMenu = "";
  if ($("#" + jq.data("menu") + "_Menu").length) {
    dMenu = $("#" + jq.data("menu") + "_Menu");
  } else {
    dMenu = $("#My_WikiTree_Menu");
  }

  if (jq.text() == "Logout") {
    if (dMenu.find("a:contains(Logout)").length < 2) {
      jq.appendTo(dMenu);
      sortMenu(dMenu);
    } else {
      jq.remove();
    }
  } else if (dMenu.find("a[href='" + jq.find("a").attr("href") + "']").length < 1) {
    jq.appendTo(dMenu);
    sortMenu(dMenu);
  } else {
    jq.remove();
  }
  jq.click(function () {
    addToCustomMenu($(this));
  });
  storeCustomMenu();
}

function addToCustomMenu(jq) {
  jq.appendTo($("#customMenu"));
  jq.click(function () {
    returnToMenu($(this));
  });
  storeCustomMenu();
  $("#menuClone a,#customMenu a").each(function () {
    if ($(this).attr("href")) {
      if (
        $(this)
          .attr("href")
          .match(/javascript/) != null
      ) {
        $(this).attr("href", "#n");
      }
    }
    $(this)[0].onclick = "";
  });
}

// end My Menu functions
