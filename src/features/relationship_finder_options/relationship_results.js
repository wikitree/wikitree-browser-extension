import { createRelationshipView } from "./relationship_views";

const profilePattern = /^\/wiki\/([^/:]+-\d+)$/;
const fields =
  "Id,Name,Gender,Mother,Father,FirstName,MiddleName,LastNameAtBirth,LastNameCurrent,BirthDate,DeathDate,Spouses";

export function isRelationshipPage(location) {
  return (
    location.pathname === "/wiki/Special:Relationship" ||
    (location.pathname === "/index.php" && new URLSearchParams(location.search).get("title") === "Special:Relationship")
  );
}

function profileKey(link) {
  try {
    const url = new URL(link.href);
    if (url.origin !== link.ownerDocument.location.origin) return null;
    return decodeURIComponent(url.pathname).match(profilePattern)?.[1] || null;
  } catch (_) {
    return null;
  }
}

function displayName(person) {
  const name =
    [person.FirstName, person.MiddleName, person.LastNameAtBirth || person.LastNameCurrent].filter(Boolean).join(" ") ||
    person.Name.replace(/-\d+$/, "").replace(/_/g, " ");
  const birth = person.BirthDate?.slice(0, 4);
  const death = person.DeathDate?.slice(0, 4);
  return (
    name +
    ((birth && birth !== "0000") || (death && death !== "0000")
      ? ` (${birth && birth !== "0000" ? birth : ""}-${death && death !== "0000" ? death : ""})`
      : "")
  );
}

export function enhanceRelationshipResults(doc, options, getPeople) {
  const cache = new Map();
  const processed = new WeakSet();
  const processedSharedLinks = new WeakSet();
  const views = new WeakMap();
  async function load(keys) {
    const missing = [...new Set(keys)].filter((key) => !cache.has(String(key)));
    for (let i = 0; i < missing.length; i += 100) {
      const batch = missing.slice(i, i + 100);
      const request = getPeople(batch, fields).then(([status, results, people]) => {
        if (status) throw new Error(status);
        Object.values(people || {}).forEach((person) => {
          if (person.Name) cache.set(person.Name, Promise.resolve(person));
          if (person.Id) cache.set(String(person.Id), Promise.resolve(person));
        });
        return { results, people: people || {} };
      });
      batch.forEach((key) =>
        cache.set(
          String(key),
          request.then(
            ({ results, people }) =>
              people[results?.[key]?.Id] ||
              Object.values(people).find((p) => p.Name === key || String(p.Id) === String(key)),
            () => undefined
          )
        )
      );
      await request;
    }
    return Promise.all(keys.map((key) => cache.get(String(key))));
  }

  async function update() {
    const container = doc.getElementById("imageContainer");
    if (!container) return;
    container.classList.toggle("wbe-relationship-flat", !!options.noIndentation);
    let view = views.get(container);
    if (view && !view.isCurrent()) {
      view.remove();
      views.delete(container);
      view = null;
    }
    if (!view) {
      view = createRelationshipView(container, options);
      if (view) views.set(container, view);
    }
    view?.refresh();
    if (!options.addSpouses && !options.genderColors) return;
    const rows = [...container.querySelectorAll("span[class]")].filter(
      (row) => [...row.classList].some((name) => /^ancestor_\d+$/.test(name)) && !processed.has(row)
    );
    const entries = rows
      .map((row) => ({ row, link: [...row.querySelectorAll("a")].find(profileKey) }))
      .filter(({ link }) => link);
    entries.forEach(({ row }) => processed.add(row));
    const summary = [...container.children].find(
      (node) => node.tagName === "P" && !node.querySelector('span[class*="ancestor_"]')
    );
    const sharedLinks = options.genderColors
      ? [...(summary?.querySelectorAll("a") || [])]
          .filter(profileKey)
          .slice(2)
          .filter((link) => !processedSharedLinks.has(link))
      : [];
    sharedLinks.forEach((link) => processedSharedLinks.add(link));
    if (!entries.length && !sharedLinks.length) return;
    try {
      const ancestors = await load([...entries.map(({ link }) => profileKey(link)), ...sharedLinks.map(profileKey)]);
      sharedLinks.forEach((link, index) => {
        link.dataset.wbeGender = ancestors[entries.length + index]?.Gender || "";
      });
      const spouseKeys = ancestors
        .flatMap((person) =>
          Object.entries(person?.Spouses || {}).map(([id, spouse]) => spouse.Name || spouse.Id || id)
        )
        .filter((key) => /^\d+$/.test(String(key)) || /^[^/:]+-\d+$/.test(String(key)));
      if (options.addSpouses) await load(spouseKeys);
      for (let i = 0; i < entries.length; i++) {
        const { row, link } = entries[i];
        if (!row.isConnected || !container.contains(row)) continue;
        link.dataset.wbeGender = ancestors[i]?.Gender || "";
        if (!options.addSpouses) continue;
        const pathRows = [...row.parentElement.querySelectorAll('span[class*="ancestor_"]')].filter((node) =>
          [...node.classList].some((name) => /^ancestor_\d+$/.test(name))
        );
        const childRow = pathRows[pathRows.indexOf(row) - 1];
        const childLink = childRow && [...childRow.querySelectorAll("a")].find(profileKey);
        const child = childLink ? await cache.get(profileKey(childLink)) : null;
        const parentId = ancestors[i]?.Id;
        const otherParent =
          parentId && Number(child?.Father) === Number(parentId)
            ? child.Mother
            : parentId && Number(child?.Mother) === Number(parentId)
            ? child.Father
            : null;
        const spouses = Object.entries(ancestors[i]?.Spouses || {}).filter(
          ([id, spouse]) => !otherParent || Number(otherParent) < 0 || Number(spouse.Id || id) === Number(otherParent)
        );
        const wrapper = doc.createElement("span");
        wrapper.className = "wbe-relationship-spouses";
        const seen = new Set();
        for (const [id, spouse] of spouses) {
          const person = await cache.get(String(spouse.Name || spouse.Id || id));
          if (!person?.Name?.match(/^[^/:]+-\d+$/) || seen.has(person.Name)) continue;
          seen.add(person.Name);
          wrapper.append(doc.createTextNode(wrapper.childNodes.length ? ", " : " and "));
          const spouseLink = doc.createElement("a");
          spouseLink.href = `/wiki/${encodeURIComponent(person.Name)}`;
          spouseLink.target = "_blank";
          spouseLink.rel = "noopener";
          spouseLink.textContent = displayName(person);
          spouseLink.dataset.wbeGender = person.Gender || "";
          wrapper.append(spouseLink);
        }
        if (wrapper.childNodes.length) link.after(wrapper);
      }
      view?.refresh(true);
    } catch (error) {
      console.warn("WBE Relationship Finder: could not load spouses", error);
    }
  }
  const observer = new MutationObserver(() => {
    void update();
  });
  observer.observe(doc.body, { childList: true, subtree: true });
  void update();
  return observer;
}
