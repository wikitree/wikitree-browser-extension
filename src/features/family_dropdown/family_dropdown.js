import $ from "jquery";
import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";

shouldInitializeFeature("family_dropdown").then((result) => {
  if (result) {
    import("./feature.css");
    peopleBox();
  }
});

async function peopleBox() {
  let allPeople = [window.BioPerson];
  allPeople = allPeople.concat(window.BioParents, window.BioSiblings, window.BioSpouses, window.BioChildren);

  const peopleBox = $(
    "<select id='peopleBox'><option hidden disabled selected value class='empty'>Copy Wiki Link &amp; Show Sources</option></select>"
  );

  allPeople.forEach(function (person) {
    let relSymbol = "";
    let relFull = "";

    if (window.BioParents.includes(person)) {
      if (person.Gender === "Male") {
        relSymbol = "[F]";
        relFull = "Father";
      }
      if (person.Gender === "Female") {
        relSymbol = "[M]";
        relFull = "Mother";
      }
      if (person.DataStatus.Gender === "blank" || person.Gender === "") {
        relSymbol = "[P]";
        relFull = "Parent";
      }
    }

    if (window.BioSpouses.includes(person)) {
      if (person.Gender === "Male") {
        relSymbol = "[H]";
        relFull = "Husband";
      }
      if (person.Gender === "Female") {
        relSymbol = "[W]";
        relFull = "Wife";
      }
      if (person.DataStatus.Gender === "blank" || person.Gender === "") {
        relSymbol = "[Sp]";
        relFull = "Spouse";
      }
    }

    if (window.BioSiblings.includes(person)) {
      if (person.Gender === "Male") {
        relSymbol = "[Bro]";
        relFull = "Brother";
      }
      if (person.Gender === "Female") {
        relSymbol = "[Sis]";
        relFull = "Sister";
      }
      if (person.DataStatus.Gender === "blank" || person.Gender === "") {
        relSymbol = "[Sib]";
        relFull = "Sibling";
      }
    }

    if (window.BioChildren.includes(person)) {
      if (person.Gender === "Male") {
        relSymbol = "[Son]";
        relFull = "Son";
      }
      if (person.Gender === "Female") {
        relSymbol = "[Dau]";
        relFull = "Daughter";
      }
      if (person.Gender === "" || person.DataStatus.Gender === "blank") {
        relSymbol = "[Ch]";
        relFull = "Child";
      }
    }

    let dName = displayName(person)[0];
    let oDisplayDates = displayDates(person);

    peopleBox.append(
      '<option title="' +
        dName +
        " was " +
        window.BioPerson.FirstName +
        "&#39;s " +
        relFull +
        '" class="' +
        person.Gender +
        '" value="' +
        "[[" +
        person.Name +
        "|" +
        dName +
        " " +
        oDisplayDates +
        ']]">' +
        relSymbol +
        " " +
        dName +
        "</option>"
    );
  });
  peopleBox.append($("<option value='other'>Other</option>"));

  peopleBox.appendTo($("#toolbar"));

  peopleBox.change(function () {
    if ($(this).val() === "other") {
      if ($("#otherPerson").length === 0) {
        let otherPerson = $(
          "<label id='otherPersonLabel'>Enter WikiTree ID and Press 'Enter': <input type='text' id='otherPerson'></label>"
        );
        otherPerson.insertAfter("#peopleBox");
        $("#otherPerson").focus();
        $("#otherPerson").on("keydown", function (event) {
          if (event.keyCode === 13) {
            getSources($(this).val());
          }
        });
      } else {
        $("#otherPerson").addClass("highlight").focus();
      }
    } else {
      copyPeopleBox();
      let anID = $(this).val().split("|")[0].substr("2");
      if (anID !== window.profileWTID) {
        getSources(anID);
      }
      $("#otherPerson").parent().removeClass("highlight");
    }
  });
}
