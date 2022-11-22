import $ from "jquery";
import "./extra_watchlist.css";
import { checkIfFeatureEnabled, getFeatureOptions } from "../../core/options/options_storage";

checkIfFeatureEnabled("extraWatchList").then((result) => {
  if (result) {
    extraWatchlist();
  }
});

async function extraWatchlist() {
  const plusImage = $(
    "<span class='awtButton' id='addToExtraWatchlistSpan'><img id='addToExtraWatchlist' title='Add to your Extra Watchlist; Right-click to see your Extra Watchlist' src='https://www.wikitree.com/g2g/qa-theme/WikiTree/favorite-plus.gif'></span>"
  );
  $("#views-inner").prepend(plusImage);

  $("#addToExtraWatchlist").contextmenu(function (e) {
    e.preventDefault();

    if ($("#extraWatchlistWindow").length == 0) {
      const eww = $("<div id='extraWatchlistWindow' class='ui-widget-content'></div>");
      eww.insertAfter($("#views-wrap"));
      $("#extraWatchlistWindow").append(
        '<h2>Extra Watchlist</h2><p id=\'ewlEmpty\'>Empty?</p><table id="touchedList"  class="all"></table>'
      );

      $("<x id='closeWatchlistWindow'>X</x>").prependTo($("#extraWatchlistWindow"));

      $("#closeWatchlistWindow").click(function () {
        $(this).parent().slideUp("swing");
      });

      // import/export extraWatchlist;
      $("#extraWatchlistWindow").prepend(
        $(
          "<a id='importExtraWatchlist' class='small button'>import</a><a id='exportExtraWatchlist' class='small button'>export</a>"
        )
      );

      // import
      const strD = strDate();

      // export

      const ewText = localStorage.extraWatchlist;
      ewText = ewText.replaceAll(/@/g, ",");

      $("#exportExtraWatchlist")
        .attr("href", makeTextFile(ewText))
        .attr("download", "extraWatchlist_" + strD + ".txt");

      $("#importExtraWatchlist").click(function (e) {
        e.preventDefault();
        var fileChooser = document.createElement("input");
        fileChooser.type = "file";

        fileChooser.addEventListener("change", function () {
          var file = fileChooser.files[0];

          var reader = new FileReader();
          reader.onload = function () {
            var data = reader.result;
            let fields = data;
          };
          reader.readAsText(file);
          setTimeout(function () {
            localStorage.setItem("extraWatchlist", reader.result.replaceAll(/,/g, "@"));
            $("#extraWatchlistWindow").remove();
            $("#addToExtraWatchlist").contextmenu();
          }, 1000);
          form.reset();
        });

        /* Wrap it in a form for resetting */
        var form = document.createElement("form");
        form.appendChild(fileChooser);
        fileChooser.click();
      });
      setTimeout(function () {
        $("#extraWatchlistWindow").slideDown();
      }, 1000);
    } else {
      $("#extraWatchlistWindow").slideToggle();
    }

    if (localStorage.extraWatchlist == null || localStorage.extraWatchlist == "") {
      $("#ewlEmpty").show();
    }

    $("#extraWatchlistWindow").dblclick(function () {
      $(this).slideUp("swing");
    });

    $(function () {
      $("#extraWatchlistWindow").draggable({
        containment: "document",
        cursor: "move",
        drag: function (event, ui) {},
      });
    });

    $("#extraWatchlistWindow").scroll(function () {
      $("#closeWatchlistWindow").css({
        top: $("#extraWatchlistWindow")[0].scrollTop,
      });
    });

    doExtraWatchlist();
  });

  if (localStorage.extraWatchlist == null) {
    localStorage.extraWatchlist = "";
  }
  const spaceMatch = window.location.href.match(/Space:.*$/);
  let thisID;
  if (spaceMatch != null) {
    thisID = spaceMatch[0];
  } else {
    thisID = $("a.pureCssMenui0 span.person").text();
  }
  if (localStorage.extraWatchlist != undefined) {
    if (localStorage.extraWatchlist.match(thisID + "@")) {
      $("#addToExtraWatchlist").addClass("onList");
      $("#addToExtraWatchlist").attr(
        "title",
        "On your Extra Watchlist (Click to remove); Right-click to see your Extra Watchlist"
      );
    }
  }

  $("#addToExtraWatchlist").click(function () {
    let thisID;
    spaceMatch = window.location.href.match(/Space:.*$/);
    if (spaceMatch != null) {
      thisID = spaceMatch[0];
    } else {
      thisID = $("a.pureCssMenui0 span.person").text();
    }

    if (localStorage.extraWatchlist == "" || localStorage.extraWatchlist == null) {
      localStorage.extraWatchlist = "";
    }

    let str = thisID.toString();
    let theChange = "add";
    if (localStorage.extraWatchlist.match(str + "@")) {
      let theChange = "remove";
      let newEW = localStorage.extraWatchlist.replace(str + "@", "");
      localStorage.setItem("extraWatchlist", newEW);
      $("#touchedList tr[data-id='" + str + "']").remove();
      $("#addToExtraWatchlist").attr("title", "Add to your Extra Watchlist");
      $("#addToExtraWatchlist").removeClass("onList");
    } else {
      const oExtraWatchlist = localStorage.extraWatchlist;
      localStorage.setItem("extraWatchlist", oExtraWatchlist + str + "@");
      $("#addToExtraWatchlist").addClass("onList");
      $("#addToExtraWatchlist").attr("title", "On your Extra Watchlist (Click to remove)");
    }
    if ($("#extraWatchlistWindow").is(":visible") && theChange == "add") {
      addExtraWatchlist(thisID);
    }
  });
} // end Extra Watchlist

function doExtraWatchlist() {
  if (Cookies.get("wikitree_wtb_UserName")) {
    window.userName = Cookies.get("wikitree_wtb_UserName");
    window.userID = Cookies.get("wikitree_wtb_UserID");
    if (localStorage.extraWatchlist != null) {
      let bits = localStorage.extraWatchlist.split("@");
      bits.forEach(function (p) {
        addExtraWatchlist(p);
      });
    }
  }
  if (Cookies.get("wikidb_wtb__session")) {
    $("#mloginForm").hide();
  }
}
