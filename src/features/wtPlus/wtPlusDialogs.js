import { wtAPICatCIBSearch } from "../../core/API/wtPlusAPI";
import { tb, wtUpdateEdit } from "./wtPlus";
import { mainDomain } from "../../core/pageType";

/**************************/
/* Select category to add */
/**************************/

export async function selectCIB(data, hideTopLevel) {
  const onDlgSelectCIBFlt = function () {
    let lb = tb.elDlgCIB.querySelector("#tb");
    let cntr = tb.elDlgCIB.querySelector("#cntr");
    var s0 = tb.elDlgCIB.querySelector("#cb1").value;
    var s1 = tb.elDlgCIB.querySelector("#flt1").value;

    if (s1.length < 3) {
      cntr.innerHTML = "enter word(s) to find";
    } else {
      // Retrieve categories
      cntr.innerHTML = "Retrieving...";
      wtAPICatCIBSearch("CIBPicker", s0, s1)
        .then((jsonData) => {
          let c = jsonData.response.categories;
          if (!c) {
            c = [];
          }
          switch (c.length) {
            case 0:
              cntr.innerHTML = "no matches";
              break;
            case 1:
              cntr.innerHTML = c.length + " match";
              break;
            case 100:
              cntr.innerHTML = "more than 100 matches";
              break;
            default:
              cntr.innerHTML = c.length + " matches";
          }
          lb.innerHTML = c
            .map((item) =>
              hideTopLevel && item.topLevel
                ? ""
                : "<tr>" +
                  `<td><a target="_blank" href="https://${mainDomain}/wiki/Category:${item.category}"><img src="${newTabIconURL}"'></a></td>` +
                  '<td class="tdSelect" data-op="onDlgSelectCIBTrSel" title="' +
                  (item.name ? "&#10;Name: " + item.name : "") +
                  (item.aka ? "&#10;aka:&#10;&nbsp;&nbsp;" + item.aka.replaceAll(";", "&#10;&nbsp;&nbsp;") : "") +
                  (item.parent ? "&#10;Parent: " + item.parent : "") +
                  (item.gParent ? "&#10;&nbsp;&nbsp;" + item.gParent : "") +
                  (item.ggParent ? "&#10;&nbsp;&nbsp;&nbsp;&nbsp;" + item.ggParent : "") +
                  (item.gggParent ? "&#10;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;" + item.gggParent : "") +
                  (item.parent1 ? "&#10;Parent 1: " + item.parent1 : "") +
                  (item.gParent1 ? "&#10;&nbsp;&nbsp;" + item.gParent1 : "") +
                  (item.parent2 ? "&#10;Parent 2: " + item.parent2 : "") +
                  (item.gParent2 ? "&#10;&nbsp;&nbsp;" + item.gParent2 : "") +
                  (item.location ? "&#10;Location: " + item.location : "") +
                  (item.locationParent ? "&#10;&nbsp;&nbsp;" + item.locationParent : "") +
                  (item.location1 ? "&#10;Location 1: " + item.location1 : "") +
                  (item.location1Parent ? "&#10;&nbsp;&nbsp;" + item.location1Parent : "") +
                  (item.succ1prev ? "&#10;Succession: " + item.succ1prev : "") +
                  (item.succ1next ? "&#10;&nbsp;" + item.succ1next : "") +
                  (item.succ1prev1 ? "&#10;Succession: " + item.succ1prev1 : "") +
                  (item.succ1next1 ? "&#10;&nbsp;" + item.succ1next1 : "") +
                  (item.succ1prev2 ? "&#10;Succession: " + item.succ1prev2 : "") +
                  (item.succ1next2 ? "&#10;&nbsp;" + item.succ1next2 : "") +
                  (item.succ1prev3 ? "&#10;Succession: " + item.succ1prev3 : "") +
                  (item.succ1next3 ? "&#10;&nbsp;" + item.succ1next3 : "") +
                  (item.succ2prev ? "&#10;Succession: " + item.succ2prev : "") +
                  (item.succ2next ? "&#10;&nbsp;" + item.succ2next : "") +
                  (item.other ? "&#10;Other:&#10;&nbsp;&nbsp;" + item.other.replaceAll(";", "&#10;&nbsp;&nbsp;") : "") +
                  '">' +
                  item.category +
                  "</td>" +
                  "</tr>"
            )
            .join("\n");
          attachEvents("td.tdSelect", "click");
        })
        .catch((error) => {
          lb.innerHTML = '<tr><td style="color:red">Error in WikiTree+ server' + error + "</td></tr>";
        });
    }
  };

  const onDlgSelectCIBTrSel = function (td) {
    removeClass("td.tdSelect", "tdSelected");
    td.classList.add("tdSelected");
  };

  const onDlgSelectCIBBtn = function (update) {
    if (update === "1") {
      if (tb.elDlgCIB.querySelectorAll("td.tdSelected").length === 0) {
        alert("No category selected: Select a category before closing the dialog");
        return false;
      }
      tb.elDlgCIB.close();
      //Add template

      tb.inserttext = "[[Category:" + tb.elDlgCIB.querySelectorAll("td.tdSelected")[0].innerText + "]]\n";
      tb.textResult = tb.inserttext + tb.textAll;
      tb.selStart = tb.textBefore.length;
      tb.selEnd = tb.selStart + tb.inserttext.length;
      tb.birthLocationResult = "";
      tb.deathLocationResult = "";
      tb.addToSummary = "Added " + tb.elDlgCIB.querySelector("#cb1").value + " Category";
      wtUpdateEdit();
    } else {
      tb.elDlgCIB.close();
      tb.addToSummary = "";
    }
    tb.elDlgCIB.innerHTML = "";
    return false;
  };

  /* Classes */

  // eslint-disable-next-line no-unused-vars
  const attachClass = (selector, className) => {
    document.querySelectorAll(selector).forEach((i) => i.classList.add(className));
  };

  const removeClass = (selector, className) => {
    document.querySelectorAll(selector).forEach((i) => i.classList.remove(className));
  };

  /* Events */

  const attachEvents = (selector, eventType) => {
    document.querySelectorAll(selector).forEach((i) => i.addEventListener(eventType, (event) => mainEventLoop(event)));
  };

  const mainEventLoop = function (event) {
    let element = event.srcElement;
    if (element.tagName == "TD") {
      if (!element.dataset.op) element = element.parentElement;
    }
    const op = element.dataset.op;
    const id = element.dataset.id;
    if (op === "onDlgSelectCIBFlt") return onDlgSelectCIBFlt();
    if (op === "onDlgSelectCIBTrSel") return onDlgSelectCIBTrSel(element);
    if (op === "onDlgSelectCIBBtn") {
      event.preventDefault();
      return onDlgSelectCIBBtn(id);
    }
  };

  const newTabIconURL = chrome.runtime.getURL("images/newTab.png");

  document.getElementById("toolbar").insertAdjacentHTML("beforeend", '<dialog id="wtPlusDlgCIB"></dialog>');
  tb.elDlgCIB = document.getElementById("wtPlusDlgCIB");

  tb.elDlgCIB.innerHTML =
    "<h3>Select " +
    data +
    " Category</h3>" +
    '<input type="checkbox" class="cbFilter" id="cb1" name="cb1" data-op="onDlgSelectCIBFlt" data-id="' +
    data +
    '" value="' +
    data +
    '" checked>' +
    '<label for="cb1"> ' +
    data +
    "</label><br>" +
    '<label for="flt1">Filter: </label><input type="text" class="cbFilter" id="flt1" name="flt1" data-op="onDlgSelectCIBFlt" data-id="9" autofocus>' +
    '<label id="cntr">enter word(s) to find</label><br>' +
    '<div style="min-width: 600px;overflow-y:auto;height: 400px;"><table style="width: 100%;" id="tb">' +
    "</table></div>" +
    '<div style="text-align:right">' +
    '<a class="button" href="https://' + mainDomain + '/wiki/Space:WikiTree_Plus_Chrome_Extension#Add_Template" target="_blank">Help</a>' +
    //OK, Cancel
    '<button style="text-align:right" class="dlgClick" data-op="onDlgSelectCIBBtn" data-id="0">Close</button>' +
    '<button style="text-align:right" class="dlgClick" data-op="onDlgSelectCIBBtn" data-id="1" value="default">Select</button>' +
    "</div>";
  attachEvents("button.dlgClick", "click");
  attachEvents("input.cbFilter", "input");
  //  attachEvents("td.tdSelect", "click");
  onDlgSelectCIBFlt();
  await tb.elDlgCIB.showModal();

  console.log("out");
}
