//import $ from "jquery";
import { shouldInitializeFeature } from "../../core/options/options_storage";
import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

shouldInitializeFeature("ancestryMatch").then((result) => {
  if (result) {
    console.log("Ancestry Match feature is enabled");
    init();
  }
});

async function init() {
  const personId = "Beacall-6";
  const people = await getThePeople(personId);
  console.log(people);
}

async function getThePeople(id) {
  //  WikiTreeAPI.getPeople(appId, nextIDsToLoad, ["Id", "Name", "LastNameAtBirth"], { ancestors: 5, minGeneration:3 }).then(
  const fields = [
    "Id",
    "Name",
    "FirstName",
    "MiddleName",
    "LastNameAtBirth",
    "BirthDate",
    "BirthLocation",
    "DeathDate",
    "DeathLocation",
  ];
  const options = { ancestors: 5, descendants: 5 };
  const appId = "WBE_ancestryMatch";
  const ids = [id];
  const people = await WikiTreeAPI.getPeople(appId, ids, fields, options);
  return people;
}
