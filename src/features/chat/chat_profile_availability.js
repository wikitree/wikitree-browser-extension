// Why the API gave Genie nothing for a profile. Paddy (G2G, 2026-10-05) asked
// "Who could test?" on a profile he had just created (Horkan-26) and was told
// it was private. The API reads from a copy of WikiTree that can run a little
// behind, so a brand-new profile isn't there yet. getPeople says which case it
// is (checked live 2026-10-05): a missing key comes back as
// {status: "Invalid profile", Id: null} with no people, and a private one comes
// back with its Id but without its name.

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";

/** "missing" (not in the API), "hidden" (private to this user), "ok" or "unknown". */
export async function checkProfileInApi(key, { appId, getPeople = WikiTreeAPI.getPeople } = {}) {
  if (!key) return "unknown";
  try {
    const [, resultByKey, people] = (await getPeople(appId, [String(key)], "Id,Name,Privacy")) || [];
    const result = resultByKey?.[String(key)];
    if (!result) return "unknown";
    if (/invalid/i.test(String(result.status || "")) || result.Id === null) return "missing";
    const person = Object.values(people || {}).find((p) => String(p?.Id) === String(result.Id));
    if (!person) return "unknown";
    return person.Name ? "ok" : "hidden";
  } catch (error) {
    return "unknown";
  }
}

/**
 * The reply for a profile the API didn't return. `what` is what Genie tried to
 * load ("ancestors"); `isPagePerson` means the user is looking at the profile
 * (or editing it), so it certainly exists.
 */
export function describeUnloadedProfile({ label, what = "", status, isPagePerson = false, apiLoggedIn = null, privateHint = "" }) {
  if (status === "missing") {
    const lag = "New profiles take a little while to reach WikiTree's API, which works from a copy of WikiTree that can fall a bit behind.";
    if (isPagePerson) return `${label} isn't in WikiTree's API yet. ${lag} Please try again in a few minutes.`;
    return `WikiTree's API has no profile ${label}. If it was created very recently, it may just not have arrived yet: ${lag} Otherwise, check the WikiTree ID.`;
  }
  if (status === "hidden") {
    const login =
      apiLoggedIn === false
        ? " If you're on its Trusted List, log in to the API with the green Apps button (it has its own login), then ask again."
        : "";
    return `${label}'s profile is private to you (usually a living person), so Genie can't see ${what ? `their ${what}` : "it"}.${login}${privateHint ? ` ${privateHint}` : ""}`;
  }
  return `I couldn't load ${what ? `${label}'s ${what}` : label} from WikiTree.`;
}

/** Whether `subject` (a root person or a key) is the profile on the page. */
export function isSamePerson(subject, pageRoot) {
  if (!subject || !pageRoot) return false;
  const ids = (value) =>
    (typeof value === "object" ? [value.key, value.wtId, value.wtid, value.Id, value.Name] : [value]).filter(Boolean).map((v) => String(v).toLowerCase());
  const pageIds = ids(pageRoot);
  return ids(subject).some((id) => pageIds.includes(id));
}

/** The whole check for a key, for handlers outside chat_people (the bio). `pageRoot`: the page person, if any. */
export async function unloadedProfileMessage(key, { appId, label = "", what = "", pageRoot = null } = {}) {
  const status = await checkProfileInApi(key, { appId });
  return describeUnloadedProfile({ label: label || String(key), what, status, isPagePerson: isSamePerson(key, pageRoot) });
}
