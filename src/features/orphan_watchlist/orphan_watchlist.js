import { shouldInitializeFeature, getFeatureOptions } from "../../core/options/options_storage";
import { getPeople } from "../dna_table/dna_table";

shouldInitializeFeature("orphanWatchlist").then((result) => {
  if (result) {
    /**
    <tr><td bgcolor="#eef" title="Male">
<a href="/wiki/Adler-1746" target="_blank">Berthold Adler</a> 
<a href="/wiki/Adler-1746#Ancestors" target="_blank">
    <img src="/images/icons/pedigree.gif.pagespeed.ce.4kSwuvQoBH.gif" border="0" width="8" height="11" alt="ancestors" title="Ancestor Pedigree Chart">
</a> 
<a href="/index.php?title=Special:Relationship&action=calculate&person1Name=Adler-1746&person2Name=Straub-620" target="_blank">
    <img src="/images/icons/relationship.gif.pagespeed.ce.Bp6vm0XjUu.gif" border="0" width="13" height="11" alt="Find Relationship" title="Find Relationship">
</a> 
<a href="/index.php?title=Special:EditPerson&u=39387513" target="_blank"><img src="/images/icons/edit.gif.pagespeed.ce.fe79TrdOz8.gif" border="0" width="11" height="11" alt="edit" title="Edit Profile"></a>
</td>
<td>
20 Dec 1911 Berlin, Provinz Brandenburg, Preußen, Deutsches Reich - 10 Jun 1990	</td>
<td>
<a href="/wiki/Help:Profile_Manager" title="Managed by you"><img src="/images/icons/M.gif.pagespeed.ce.UgS-kJInMD.gif" width="9" height="9" alt="Managed by You" border="0"/></a> 
<a href="/index.php?title=Special:Surname&s=Adler&limit=5000&order=name&u=23097626" title="View all Adler profiles on your Watchlist" target="_blank">Adler</a>
<span title="WikiTree ID Adler-1746">-1746</span> 
<button aria-label="Copy ID" class="copyWidget" data-copy-text="Adler-1746"><img src="/images/icons/copy.png.pagespeed.ce.0gdC2H4hZP.png"></button>
</td>
<td><a href="/index.php?title=Special:NetworkFeed&who=Adler-1746" title="Last Changes" target="_blank">Jul 16, 2023</a></td>
<td>
<img class="privacy_dots" src="/images/icons/bullet60.gif.pagespeed.ce.rUBRf7PHZA.gif" width="10" height="10" title="Privacy Level: Open" alt="Privacy Level: Open (White)"/>
<img class="privacy_locks" src="/images/icons/privacy60.png.pagespeed.ce.40ChhYgHYM.png" title="Privacy Level: Open" alt="Privacy Level: Open (White)"/>
</td></tr>
    **/

    // document.forms[0]
    //     document.innerHTML =
    //       '<form id="editform" name="editform" method="post" action="/wiki/Special:TrustedListChanges" enctype="multipart/form-data">' +
    //       document.innerHTML +
    //       "</form>";
    const profileRows = document.getElementsByTagName("tr");

    for (let i = 1 /* skip sorting table */; i < profileRows.length; i++) {
      const editLink = profileRows[i].getElementsByTagName("a")[3];
      var urlParams = new URLSearchParams(editLink.href);
      if (urlParams.has("u")) {
        const profileId = urlParams.get("u");
        const checkBox = document.createElement("input");
        checkBox.type = "checkbox";
        checkBox.name = "idlist[]";
        checkBox.value = profileId;
        editLink.parentNode.insertBefore(checkBox, editLink.parentNode.firstChild);
      }
    }

    const nextButton = document.getElementsByClassName("twelve columns center")[0];
    const orphanButton = document.createElement("input");
    orphanButton.type = "button";
    orphanButton.value = "orphan selected";
    orphanButton.addEventListener("click", () => {
      DoOrphan();
    });
    nextButton.appendChild(orphanButton);
  }
});

async function DoOrphan() {
  const form = CreateForm();

  const ids = GetIdsToOrphan();
  while (ids.length) {
    let chunk = ids.splice(0, 100).join(",");
    getPeople(chunk, 0, 0, 0, 0, 0, "id,PageId,Name,TrustedList", "WBE_orphan_watchlist").then((data) => {
      let theKeys = Object.keys(data[0].people);
      theKeys.forEach(function (aKey) {
        let person = data[0].people[aKey];
        addInvisibleInput(form, "idlist[]", person.PageId);
      });
    });
  }
  const myId = getMyId();
  addInvisibleInput(form, "action", "remove");
  addInvisibleInput(form, "personId", myId);
  addInvisibleInput(form, "go", "1");

  const submitButton = document.createElement("input");
  submitButton.type = "submit";
  submitButton.value = "Continue";
  form.appendChild(submitButton);

  getMyEmail(myId).then((myEmail) => {
    addInvisibleInput(form, "object_email", myEmail);
    submitButton.click();
  });
}

function CreateForm() {
  const form = document.createElement("form");
  form.id = "editform";
  form.method = "post";
  form.action = "/wiki/Special:TrustedListChanges";
  form.target = "_blank";
  form.enctype = "multipart/form-data";
  form.style.visibility = "collapse";
  document.body.appendChild(form);
  return form;
}

function GetIdsToOrphan() {
  const ids = [];
  const checkBoxes = document.getElementsByName("idlist[]");
  for (let i = 0; i < checkBoxes.length; i++) {
    if (checkBoxes[i].checked) {
      ids.push(checkBoxes[i].value);
    }
  }
  return ids;
}

async function getMyEmail(myId) {
  return new Promise(function (resolve, reject) {
    fetch("https://www.wikitree.com/index.php?title=Special:EditPerson&u=" + myId)
      .then((response) => response.text())
      .then((text) => {
        const parser = new DOMParser();
        const htmlDocument = parser.parseFromString(text, "text/html");
        const myEmail = htmlDocument.getElementsByName("mEmail")[0].value + "";
        resolve(myEmail);
      });
  });
}

function getMyId() {
  const menuLinks = document.getElementsByClassName("pureCssMenui");
  for (let i = 0; i < menuLinks.length; i++) {
    const indexU = menuLinks[i].href.indexOf("&u=");
    if (indexU > -1) {
      return menuLinks[i].href.substr(indexU + "&u=".length);
    }
  }
}

function addInvisibleInput(parent, name, value) {
  const inputGo = document.createElement("input");
  inputGo.name = name;
  inputGo.value = value;
  parent.appendChild(inputGo);
}
