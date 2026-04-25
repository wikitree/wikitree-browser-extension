import { theSourceRules } from "../bioCheck/SourceRules.js";
import { BioCheckPerson } from "../bioCheck/BioCheckPerson.js";
import { Biography } from "../bioCheck/Biography.js";

export const unsourced =
  /^\n*?\s*?((^Also:$)|(^See also:$)|(Unsourced)|(Personal (recollection)|(information))|(Firsthand knowledge)|(Sources? will be added)|(Add\s\[\[sources\]\]\shere$)|(created.*?through\sthe\simport\sof\s.*?\.ged)|(FamilySearch(\.com)?$)|(ancestry\.com$)|(family records$)|(Ancestry family trees$))/im;

export function autoBioCheck(sourcesStr) {
  let thePerson = new BioCheckPerson();
  thePerson.build();
  let biography = new Biography(theSourceRules);
  biography.parse(sourcesStr, thePerson, "");
  biography.validate();
  const hasSources = biography.hasSources();
  return hasSources;
}
