import $ from "jquery";
import { htmlEntities } from "../../core/common.js";
import { secondarySort } from "../extra_watchlist/extra_watchlist.js";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

function wills() {
  if (window.location.href.match(/https:\/\/www\.wikitree\.com\/wiki\/Category:.*?_Wills_and_Estates/) != null) {
    const items = $("div.P-ITEM");
    const itemsArr = [];
    items.each(function () {
      let wPlace = "";
      let personText = "";
      let wYear = "";
      let info = "";
      let prob = "";
      let alink = $(this).find("a");
      let link = alink.attr("href");
      let wText = alink.text();
      let isTranscript = false;
      if (wText.match(/transcr?ipt/i) != null) {
        isTranscript = true;
      }
      let textReduced = wText.split(/will of/i);
      if (textReduced[1]) {
        let trSplit = textReduced[1].split("of");
        if (trSplit[1]) {
          wPlace = trSplit[1].match(/[A-z\s]+/);
        }
        personText = trSplit[0];
        const personTextSplit = personText.split(",");
        if (personTextSplit[1]) {
          personText = personTextSplit[0].trim();
          info = personTextSplit[1].trim();
        }
      }
      const wYearMatch = [...wText.matchAll(/[0-9]{4}/g)];

      if (wYearMatch[1]) {
        wYear = wYearMatch[1];
      } else {
        wYear = wYearMatch[0];
      }

      const probMatch = wText.match(/PROB [0-9\/]+/);
      if (probMatch != null) {
        prob = probMatch[0];
      }

      if (personText.match("Wheelwright Attleborough") != null) {
        wPlace = "Attleborough";
        info = "Wheelwright";
        personText = personText.replace("Wheelwright Attleborough", "");
      }
      if (personText.match("Robert Wrighte")) {
        personText = personText.replace("Tanner", "");
        info = "Tanner";
      }

      const infoBits = ["Widow", "the elder", "the Younger", "Esquire", "Wheelwright"];
      const strip = ["c[.]", " -"];
      strip.forEach(function (str) {
        const reg = new RegExp(str, "i");
        personText = personText.replace(reg, "");
      });

      infoBits.forEach(function (str) {
        const reg = new RegExp(str, "i");
        const regMatch = personText.match(reg);
        if (regMatch != null) {
          info = regMatch[0];
          personText = personText.replace(reg, "");
        }
      });

      personText = personText
        .replaceAll(/[0-9]/g, "")
        .replace(/\(proved.*?\)/, "")
        .replace(/ \-/, "")
        .trim();

      let personTextSplit = personText.split(" ");
      let surname = personTextSplit[personTextSplit.length - 1].replaceAll(/[()]/g, "");

      let glos = false;
      if (wText.match(/Will \([0-9]+?(, [0-9]+?)?\)/) != null) {
        const wTextSp = wText.split(/\([0-9]+\) of/);
        if (wTextSp[1]) {
          let sp2 = wTextSp[1].split("of");
          personText = sp2[0].trim();
          if (sp2[1]) {
            const sp3 = sp2[1].split("-");
            wPlace = sp3[0].trim();
            if (sp3[1]) {
              info = sp3[1].trim();
            }
          }
        }
        personTextSplit = personText.split(" ");
        surname = personTextSplit[personTextSplit.length - 1].replaceAll(/[()]/g, "");
        glos = true;
      }

      if ((wText.match(/Estate of/) != null || wText.match(/Estate:/) != null) && personText == "") {
        let sp = wText.split(/Estate of/);
        if (sp[1]) {
          personText = sp[1].trim();
        } else {
          sp = wText.split(/Estate:/);
          if (sp[1]) {
            personText = sp[1].trim();
          }
        }
        if (personText != "") {
          personTextSplit = personText.split(" ");
          surname = personTextSplit[personTextSplit.length - 1].replaceAll(/[()]/g, "");
        }
      }

      const aWill = {};
      aWill.person = personText;
      if (wPlace != "" && glos == false) {
        if (wPlace != "Attleborough") {
          aWill.place = wPlace[0].trim();
        } else {
          aWill.place = wPlace;
        }
      } else if (glos == true) {
        aWill.place = wPlace;
      } else {
        aWill.place = "";
      }
      if (wYear != null) {
        aWill.year = wYear[0];
      } else {
        aWill.year = "";
      }
      aWill.info = info;
      aWill.link = link;
      aWill.prob = prob;
      aWill.title = wText;
      aWill.surname = surname;
      itemsArr.push(aWill);
    });

    if (itemsArr.length > 0) {
      const willTable = $(
        "<table id='willTable'><thead><tr><th id='willTableName' data-order='asc'>Name</th><th id='willTableYear' data-order=''>Year</th><th id='willTablePlace' data-order=''>Place</th><th>More</th></tr>\n<tbody></tbody>\n</thead>\n</table>"
      );
      itemsArr.forEach(function (w) {
        willTable
          .find("tbody")
          .append(
            $(
              "<tr data-surname='" +
                htmlEntities(w.surname) +
                "' data-year='" +
                htmlEntities(w.year) +
                "' data-place='" +
                htmlEntities(w.place) +
                "' data-name='" +
                htmlEntities(w.person) +
                "'><td><a href='" +
                htmlEntities(w.link) +
                "'>" +
                htmlEntities(w.person) +
                "</a></td><td>" +
                htmlEntities(w.year) +
                "</td><td class='wPlace'>" +
                htmlEntities(w.place) +
                "</td><td>" +
                htmlEntities(w.info) +
                "</td></tr>"
            )
          );
      });
      $("div.row.Pages").append(willTable);
    }

    const rows = $("#willTable tbody tr");
    let sorter = "surname";
    rows.sort(function (a, b) {
      if ($(b).data(sorter) == "") {
        return true;
      }
      return $(a).data(sorter).localeCompare($(b).data(sorter));
    });
    rows.appendTo($("#willTable tbody"));
    secondarySort(rows, "surname", "name", 1);
    window.wTbody = $("#willTable tbody tr").clone(true);

    $("#willTableName,#willTablePlace,#willTableYear").click(function () {
      sortWillTable($(this));
    });
  }
}

function secondarySort3(rows, dataThing1, dataThing2, isText = 0) {
  let lastOne = "Me";
  let tempArr = [lastOne];
  rows.each(function (index) {
    if ($(this).attr("data-" + dataThing1) == lastOne) {
      tempArr.push($(this));
    } else {
      tempArr.sort(function (a, b) {
        if (isText == 1) {
          return $(a)
            .attr("data-" + dataThing2)
            .localeCompare($(b).attr("data-" + dataThing2));
        } else {
          return $(a).attr("data-" + dataThing2) - $(b).attr("data-" + dataThing2);
        }
      });

      tempArr.forEach(function (item) {
        if (lastOne != "Me") {
          item.appendTo("#willTable tbody");
        }
      });
      tempArr = [$(this)];
    }
    lastOne = $(this).attr("data-" + dataThing1);
  });
}

function sortWillTable(jq) {
  let rows = $("#willTable tbody tr");
  let sorter;
  let nRows;
  if (jq.attr("id") == "willTableName" || jq.attr("id") == "willTablePlace") {
    if (jq.attr("id") == "willTableName") {
      sorter = "surname";
    }
    if (jq.attr("id") == "willTablePlace") {
      sorter = "place";
    }
    $.fn.reverse = [].reverse;

    if (jq.attr("data-order") == "asc") {
      nRows = rows.reverse();
      jq.attr("data-order", "desc");
    } else if (jq.attr("data-order") == "desc") {
      nRows = rows.reverse();
      jq.attr("data-order", "asc");
    } else {
      if (sorter == "surname") {
        $("#willTable tbody").html("");
        $("#willTable tbody").html(window.wTbody);
        rows = $();
      } else {
        rows.sort(function (a, b) {
          return $(a)
            .attr("data-" + sorter)
            .localeCompare($(b).attr("data-" + sorter));
        });
      }
      jq.attr("data-order", "asc");
      if (sorter == "place") {
        secondarySort3(rows, "place", "surname", 1);
      }
    }
  } else if (jq.attr("id") == "willTableYear") {
    if (jq.attr("data-order") == "asc") {
      rows.sort((a, b) => ($(b).data("year") > $(a).data("year") ? 1 : -1));
      jq.attr("data-order", "desc");
    } else {
      rows.sort((a, b) => ($(b).data("year") < $(a).data("year") ? 1 : -1));
      jq.attr("data-order", "asc");
    }
  }

  const arr = ["willTableName", "willTablePlace", "willTableYear"];
  arr.forEach(function (thing) {
    if (thing != jq.attr("id")) {
      $("#" + thing).attr("data-order", "");
    }
  });
  rows.appendTo($("#willTable tbody"));

  if (jq.attr("id") == "willTablePlace") {
    $("#willTable td.wPlace").each(function () {
      if ($(this).text() == "") {
        $(this).parent().appendTo("#willTable tbody");
      }
    });
  }
}

shouldInitializeFeature("wills").then((result) => {
  if (result && $("#willTable").length == 0) {
    wills();
    import("./wills.css");
  }
});
