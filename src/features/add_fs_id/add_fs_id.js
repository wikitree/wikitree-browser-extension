import { shouldInitializeFeature } from "../../core/options/options_storage";
import { profilePerson, isOK } from "../../core/common";
import $ from "jquery";

shouldInitializeFeature("addFSId").then((result) => {
  addFamilySearchIDLink();
});

async function addFamilySearchIDLink() {
  //show link to add FamilySearch ID if not present
  const aside = $("#Research");
  if (aside.length) {
    const lastHelp = aside.find("a").last();

    const insertTag = $("<span id='addFSID'></span>");
    const fsIDs = aside.find("a[href*='familysearch.org/tree/person/details/']").length;
    let mClass = "editFamilySearchIDs btn btn-secondary btn-small";
    let mLinkText;
    if (fsIDs == 1) {
      mLinkText = "Edit FamilySearch ID";
    } else if (fsIDs > 1) {
      mLinkText = "Edit FamilySearch IDs";
    } else {
      mLinkText = "Add FamilySearch ID";
      mClass = "addFamilySearchIDs btn btn-secondary btn-small";
    }
    const linkAddFamilySearch =
      `<a class="${mClass}"` +
      ` href="https://www.wikitree.com/index.php?title=Special:EditFamilySearch&action=viewUser&user_name=${profilePerson.Name}">` +
      ` ${mLinkText}</a>`;
    const linkSearchFamilyTree =
      '<a id="searchFSTree" href="#n">Search FamilySearch Tree</a><a id="searchFSRecords" href="#n">Search FamilySearch Records</a>';
    insertTag.html(linkAddFamilySearch + linkSearchFamilyTree);
    lastHelp.after(insertTag);
    $("#searchFSTree").on("click", function (e) {
      e.preventDefault();
      searchFSTree();
    });
    $("#searchFSRecords").on("click", function (e) {
      e.preventDefault();
      searchFSRecords();
    });
  } //if
}

//
// The methods below should should be revisted and getBioPerson probably be replaced with a call
// to WiokiTreeAPI.getPerson or similar. Also we should check for any of the other person objects being
// stored in widow but currently formats differ. There's room for consolidation of all these profile
// objects across WBE.
//

async function searchFSTree() {
  let oPerson;
  if (window.BioPerson) {
    oPerson = window.BioPerson;
  } else {
    // Get person from API
    oPerson = await getBioPerson();
    // console.log(oPerson);
  }
  let goToFS = "https://www.familysearch.org/search/tree/results?";

  goToFS += "count=20";
  goToFS += "&q.surname=" + oPerson.LastNameAtBirth;
  goToFS += "&q.givenName=" + oPerson.FirstName;

  goToFS += "&q.sex=" + oPerson.Gender;
  let birth = false;
  if (isOK(oPerson.BirthLocation)) {
    goToFS += "&q.birthLikePlace=" + oPerson.BirthLocation;
    birth = true;
  }
  const bYear = oPerson.BirthDate.match(/[0-9]{4}/)[0];
  if (bYear != "0000") {
    const bYearFrom = parseInt(bYear) - 2;
    const bYearTo = parseInt(bYear) + 2;

    goToFS += "&q.birthLikeDate.from=" + bYearFrom;
    goToFS += "&q.birthLikeDate.to=" + bYearTo;
  }
  let death = false;
  if (isOK(oPerson.DeathLocation)) {
    goToFS += "&q.deathLikePlace=" + oPerson.DeathLocation;
    death = true;
  }
  const dYear = oPerson.DeathDate.match(/[0-9]{4}/)[0];
  if (dYear != "0000") {
    const dYearFrom = parseInt(dYear) - 2;
    const dYearTo = parseInt(dYear) + 2;

    goToFS += "&q.deathLikeDate.from=" + dYearFrom;
    goToFS += "&q.deathLikeDate.to=" + dYearTo;
  }

  if (isOK(oPerson.Parent)) {
    oPerson.Parent.forEach(function (aPar) {
      if (aPar.Id == oPerson.Father) {
        goToFS += "&q.fatherSurname=" + aPar.LastNameAtBirth;
        goToFS += "&q.fatherGivenName=" + aPar.FirstName;
      }
      if (aPar.Id == oPerson.Mother) {
        goToFS += "&q.motherSurname=" + aPar.LastNameAtBirth;
        goToFS += "&q.motherGivenName=" + aPar.FirstName;
      }
    });
  }
  if (isOK(oPerson.Spouse)) {
    if (oPerson.Spouse[0]) {
      goToFS += "&q.spouseGivenName=" + oPerson.Spouse[0].FirstName;
      if (isOK(oPerson.Spouse[0].marriage_date)) {
        const mYear = oPerson.Spouse[0].marriage_date.match(/[0-9]{4}/)[0];
        if (mYear != "0000") {
          const mYearFrom = parseInt(dYear) - 2;
          const mYearTo = parseInt(dYear) + 2;
          goToFS += "&marriageLikeDate.from=" + mYearFrom;
          goToFS += "&marriageLikeDate.to=" + mYearTo;
        }
      }
      if (isOK(oPerson.Spouse[0].marriage_location)) {
        goToFS += "&q.marriageLikePlace=" + oPerson.Spouse[0].marriage_location;
      }
    }
  }
  window.open(goToFS);
}

async function searchFSRecords() {
  let oPerson;
  if (window.BioPerson) {
    oPerson = window.BioPerson;
  } else {
    // Get person from API
    oPerson = await getBioPerson();
    console.log(oPerson);
  }
  let goToFS = "https://www.familysearch.org/search/record/results?";
  goToFS += "q.sex=" + oPerson.Gender;
  goToFS += "&q.givenName=" + oPerson.FirstName;
  if (isOK(oPerson.MiddleName)) {
    goToFS += "%20" + oPerson.MiddleName;
  }
  goToFS += "&q.surname=" + oPerson.LastNameAtBirth;
  goToFS += "&q.givenName.1=" + oPerson.FirstName;
  if (isOK(oPerson.MiddleName)) {
    goToFS += "%20" + oPerson.MiddleName;
  }
  goToFS += "&q.surname.1=" + oPerson.LastNameAtBirth;
  if (oPerson.LastNameCurrent != oPerson.LastNameAtBirth) {
    goToFS += "&q.givenName.2=" + oPerson.FirstName;
    if (isOK(oPerson.MiddleName)) {
      goToFS += "%20" + oPerson.MiddleName;
    }
    goToFS += "&q.surname.2=" + oPerson.LastNameCurrent;
  }

  if (isOK(oPerson.BirthLocation)) {
    goToFS += "&q.birthLikePlace=" + oPerson.BirthLocation;
  }
  const bYear = oPerson.BirthDate.match(/[0-9]{4}/)[0];
  if (bYear != "0000") {
    const bYearFrom = parseInt(bYear) - 2;
    const bYearTo = parseInt(bYear) + 2;
    goToFS += "&q.birthLikeDate.from=" + bYearFrom;
    goToFS += "&q.birthLikeDate.to=" + bYearTo;
  }
  if (isOK(oPerson.DeathLocation)) {
    goToFS += "&q.deathLikePlace=" + oPerson.DeathLocation;
  }
  const dYear = oPerson.DeathDate.match(/[0-9]{4}/)[0];
  if (dYear != "0000") {
    const dYearFrom = parseInt(dYear) - 2;
    const dYearTo = parseInt(dYear) + 2;
    goToFS += "&q.deathLikeDate.from=" + dYearFrom;
    goToFS += "&q.deathLikeDate.to=" + dYearTo;
  }
  let oSpouses;
  let oParents;
  if (window.BioSpouses) {
    oSpouses = window.BioSpouses;
    oSpouses.forEach(function (oSp, i) {
      let spN = "";
      if (i > 0) {
        spN = "." + i;
      }
      if (isOK(oSp.marriage_date)) {
        const mYear = oSp.marriage_date.match(/[0-9]{4}/)[0];
        const mYearFrom = parseInt(mYear) - 2;
        const mYearTo = parseInt(mYear) + 2;
        goToFS += "&q.marriageLikeDate.from=" + mYearFrom;
        goToFS += "&q.marriageLikeDate.to=" + mYearTo;
      }
      if (isOK(oSp.marriage_location)) {
        goToFS += "&q.marriageLikePlace=" + oSp.marriage_location;
      }
      goToFS += "&q.spouseGivenName" + spN + "=" + oSp.FirstName;
      goToFS += "&q.spouseSurname" + spN + "=" + oSp.LastNameAtBirth;
    });
  }
  if (window.BioParents) {
    oParents = window.BioParents;
    oParents.forEach(function (oSp, i) {
      if (oSp.Id == oPerson.Father) {
        goToFS += "&q.fatherGivenName=" + oSp.FirstName;
        goToFS += "&q.fatherSurname=" + oSp.LastNameAtBirth;
      }
      if (oSp.Id == oPerson.Mother) {
        goToFS += "&q.motherGivenName=" + oSp.FirstName;
        goToFS += "&q.motherSurname=" + oSp.LastNameAtBirth;
      }
    });
  }
  window.open(goToFS);
}

async function getBioPerson() {
  if (window.BioPerson) {
    return window.BioPerson;
  } else {
    const theID = profilePerson?.Name;
    if (theID) {
      try {
        const data = await $.ajax({
          url: "https://api.wikitree.com/api.php",
          crossDomain: true,
          xhrFields: { withCredentials: true },
          type: "POST",
          data: {
            action: "getProfile",
            key: theID,
            fields:
              "Id,Name,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,BirthDate,BirthLocation,DeathDate,DeathLocation,Gender,Parents,Spouses,Father,Mother",
          },
          dataType: "json",
        });

        // console.log(data);
        window.BioPerson = data[0]?.profile;
        // Parents and Spouses are either empty arrays or objects with the Id as the key
        // Convert them to arrays as .Parent and .Spouse
        if (window.BioPerson) {
          window.BioPerson.Parent = Object.values(window.BioPerson.Parents);
          window.BioPerson.Spouse = Object.values(window.BioPerson.Spouses);
        }

        return window.BioPerson;
      } catch (error) {
        console.error("Error fetching bio person:", error);
        return null; // In case of error
      }
    } else {
      return null;
    }
  }
}
