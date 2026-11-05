import { extractConnectionSourceName, pause } from "./chat_router";

// Explicit endpoints take precedence; an omitted endpoint belongs to the page
// person on profile/edit pages and to the signed-in user on other pages.
export function createConnectionSourceResolver({
  promptRefersToUser,
  getLoggedInRootPerson,
  getProfileSubjectRoot,
  isPersonPage,
  resolveConnectionTargetPerson,
}) {
  return async function resolveConnectionSourceRoot(prompt, targetWtId = "", sourceNameOverride = "") {
    const normalizedPrompt = String(prompt || "").trim();
    const overrideName = String(sourceNameOverride || "").trim();
    if (!overrideName && promptRefersToUser(normalizedPrompt)) {
      let root = await getLoggedInRootPerson();
      if (!root) {
        await pause(150);
        root = await getLoggedInRootPerson();
      }
      return root;
    }

    const namedSource = overrideName || extractConnectionSourceName(normalizedPrompt);
    // F8 (live, 2026-10-03): "is she related to Captain James Cook?" came back
    // with the source "Ellen (Cook) Alley", the page's display name, which name
    // search can't resolve. A pronoun or the page's own name is the page profile.
    const pageRoot = isPersonPage() ? getProfileSubjectRoot() : null;
    const sameName = (left, right) =>
      String(left || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim() ===
      String(right || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .trim();
    if (
      namedSource &&
      pageRoot &&
      (/^(?:she|he|they|her|him|them|this\s+person|the\s+profile\s+person)$/i.test(namedSource) ||
        sameName(namedSource, pageRoot.displayName) ||
        sameName(namedSource, pageRoot.wtId) ||
        // P5 (live, 2026-10-03): "the relationship between Ellen and Amy Alley" on
        // Ellen's page: "Ellen" alone was unresolved.
        (/^[A-Za-z'-]+$/.test(namedSource) &&
          sameName(namedSource, String(pageRoot.displayName || "").split(/\s+/)[0])))
    ) {
      return pageRoot;
    }
    if (namedSource) {
      const resolved = await resolveConnectionTargetPerson(namedSource, normalizedPrompt);
      if (!resolved?.Name) {
        return { unresolvedName: namedSource };
      }

      const sourceWtId = resolved.Name || "";
      if (sourceWtId && targetWtId && sourceWtId === targetWtId) {
        return { unresolvedName: namedSource };
      }

      return {
        key: resolved.Id || resolved.Name,
        wtId: sourceWtId,
        displayName: resolved.RealName || resolved?.Derived?.ShortName || resolved.Name || namedSource,
        subjectType: "named",
      };
    }

    return isPersonPage() ? pageRoot : await getLoggedInRootPerson();
  };
}
