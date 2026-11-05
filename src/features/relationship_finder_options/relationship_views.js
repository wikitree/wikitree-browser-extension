const rowSelector = 'span[class*="ancestor_"]';
const isRow = (row) => [...row.classList].some((name) => /^ancestor_\d+$/.test(name));
const profileLink = (link) => /\/wiki\/[^/:]+-\d+(?:[?#].*)?$/.test(link.getAttribute("href") || "");

function element(doc, tag, className, text) {
  const node = doc.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

export function ancestorHeading(name, generations, plural, gender) {
  const person = name.replace(/\s*\([^()]*\)\s*$/, "").trim();
  const suffix = plural ? "s" : "";
  const parent =
    !plural && gender === "Male" ? "father" : !plural && gender === "Female" ? "mother" : `parent${suffix}`;
  let relationship = generations === 1 ? parent : `grand${parent}`;
  if (generations > 2) {
    const greats = generations - 2;
    const ending = greats % 100 >= 11 && greats % 100 <= 13 ? "th" : { 1: "st", 2: "nd", 3: "rd" }[greats % 10] || "th";
    relationship = `${greats === 1 ? "" : `${greats}${ending} `}great grand${parent}`;
  }
  return `${person}’s ${relationship}`;
}

export function createRelationshipView(container, options) {
  const doc = container.ownerDocument;
  const paragraphs = [...container.children].filter((node) => node.tagName === "P");
  const trails = paragraphs
    .map((paragraph) => ({
      paragraph,
      rows: [...paragraph.querySelectorAll(rowSelector)].filter(isRow),
    }))
    .filter((trail) => trail.rows.length);
  if (trails.length !== 1 && trails.length !== 2) return null;
  const direct = trails.length === 1;
  const summary = paragraphs.find((paragraph) => !trails.some((trail) => trail.paragraph === paragraph));
  const summaryLinks = summary ? [...summary.querySelectorAll("a")].filter(profileLink) : [];
  let starts;
  let ancestors;
  if (direct) {
    const root = [...trails[0].rows[trails[0].rows.length - 1].querySelectorAll("a")].find(profileLink);
    if (!root) return null;
    const name = trails[0].rows[0].textContent.replace(/\s+/g, " ").match(/^\s*\d+\.\s*(.*?)\s+is\b/i)?.[1];
    if (!name) return null;
    const imageButton = [...doc.querySelectorAll("button[onclick]")].find((button) =>
      button.getAttribute("onclick").includes("getImageForDiv('imageContainer'")
    );
    const imageKeys =
      imageButton
        ?.getAttribute("onclick")
        .match(/Relationship_([^/]+-\d+)_([^/]+-\d+)\.png/)
        ?.slice(1) || [];
    const inputKeys = [doc.getElementById("person1_name")?.value, doc.getElementById("person2_name")?.value];
    const rootKey = root.getAttribute("href").split("/wiki/")[1];
    const endpointKey = [...imageKeys, ...inputKeys].find((key) => key && /^[^/:]+-\d+$/.test(key) && key !== rootKey);
    const endpoint = element(doc, endpointKey ? "a" : "span", "", name);
    if (endpointKey) {
      endpoint.href = `/wiki/${endpointKey}`;
      endpoint.target = "_blank";
    }
    starts = [endpoint];
    ancestors = [root];
  } else {
    if (summaryLinks.length < 2) return null;
    starts = summaryLinks.slice(0, 2);
    ancestors = summaryLinks.slice(2);
  }
  const shortNames = starts.map((link) => link.textContent.trim().split(/\s+/)[0]);
  let layout = options.layout === "sideBySide" ? "sideBySide" : "original";
  let signature = "";
  const panel = element(doc, "div", "wbe-relationship-tools");
  const toolbar = element(doc, "div", "wbe-relationship-toolbar");
  toolbar.setAttribute("data-html2canvas-ignore", "true");
  const label = element(doc, "label", "", "View ");
  const select = element(doc, "select", "form-select form-select-sm");
  select.setAttribute("aria-label", "Relationship result layout");
  [
    ["original", "Original"],
    ["sideBySide", direct ? "Path" : "Side by side"],
  ].forEach(([value, text]) => {
    const option = element(doc, "option", "", text);
    option.value = value;
    select.append(option);
  });
  select.value = layout;
  label.append(select);
  toolbar.append(label);
  const content = element(doc, "div", "wbe-relationship-view");
  const notice = element(doc, "span", "wbe-relationship-notice");
  notice.setAttribute("role", "status");
  const heading = [...container.children].find((node) => node.tagName === "H3");
  const header = heading ? element(doc, "div", "wbe-relationship-header") : null;
  if (header) {
    container.insertBefore(header, heading);
    header.append(heading, toolbar);
    panel.append(content);
  } else {
    panel.append(toolbar, content);
  }
  container.classList.add("wbe-relationship-enhanced");
  container.insertBefore(panel, trails[0].paragraph);

  function statusFor(row) {
    const statuses = [...row.querySelectorAll('a[href*="/wiki/Help:"]')]
      .filter((link) => !link.href.includes("Help:Privacy"))
      .map((link) => {
        const title =
          link.getAttribute("title") || link.querySelector("[data-bs-title]")?.getAttribute("data-bs-title");
        return (title || link.textContent.trim() || "Relationship status").split(";")[0];
      });
    return [...new Set(statuses)].join("; ");
  }

  function relation(row) {
    const match = row.textContent.match(/\bis (?:the )?(son|daughter|child) of\b/i);
    return match ? match[1].toLowerCase() : "child";
  }

  function personCard(link, gender, primary = true) {
    const card = element(doc, "span", primary ? "wbe-relationship-path-person" : "wbe-relationship-spouse-person");
    if (options.genderColors !== false) {
      card.classList.add(
        "background--gender-" + (gender === "Male" ? "male" : gender === "Female" ? "female" : "no-gender")
      );
    }
    if (link) {
      const clone = link.cloneNode(true);
      clone.classList.remove(
        "wbe-relationship-direct",
        "wbe-relationship-coloured-link",
        "background--gender-male",
        "background--gender-female",
        "background--gender-no-gender"
      );
      if (primary && options.highlightLineage) clone.classList.add("wbe-relationship-direct");
      card.append(clone);
    }
    return card;
  }

  function steps(trail, index) {
    const ordered = [...trail.rows].reverse();
    return Array.from({ length: ordered.length + 1 }, (_, generation) => {
      const source = generation < ordered.length ? ordered[generation] : null;
      const incoming = generation ? ordered[generation - 1] : null;
      const link = source ? [...source.querySelectorAll("a")].find(profileLink) : starts[index];
      const kind = incoming ? relation(incoming) : null;
      const gender = kind === "son" ? "Male" : kind === "daughter" ? "Female" : link?.dataset.wbeGender;
      return { source, incoming, link, kind, gender, generation };
    });
  }

  function personCell(step, parent) {
    const cell = element(doc, "div", "wbe-relationship-person");
    if (parent) {
      cell.setAttribute(
        "aria-label",
        `${step.link?.textContent || "Private person"}, ${step.kind} of ${
          parent.link?.textContent || "the shared ancestor"
        }`
      );
    }
    const people = element(doc, "div", "wbe-relationship-couple");
    const primary = personCard(step.link, step.gender);
    if (!step.link) {
      const text = step.source?.textContent.replace(/^\s*\d+\.\s*/, "") || "[Private]";
      primary.textContent = text.match(/\bis (?:the )?(?:son|daughter|child) of\s+([\s\S]+)/i)?.[1] || text;
    }
    people.append(primary);
    const spouses = step.source?.querySelector(".wbe-relationship-spouses");
    if (spouses) {
      const beside = element(doc, "span", "wbe-relationship-beside");
      const equals = element(doc, "span", "wbe-relationship-spouse-label", "=");
      equals.setAttribute("aria-label", "Spouse");
      beside.append(equals);
      [...spouses.querySelectorAll("a")].forEach((link, index) => {
        if (index) beside.append(doc.createTextNode(", "));
        beside.append(personCard(link, link.dataset.wbeGender, false));
      });
      people.append(beside);
    }
    if (parent && options.showStatus) {
      const statusLinks = [...step.incoming.querySelectorAll('a[href*="/wiki/Help:"]')].filter(
        (link) => !link.href.includes("Help:Privacy") && link.querySelector('[class*="icon--"], img')
      );
      statusLinks.forEach((link) => {
        const iconLink = link.cloneNode(true);
        iconLink.classList.add("wbe-relationship-status-icon");
        const description = link.getAttribute("title") || statusFor(step.incoming);
        iconLink.setAttribute("aria-label", description);
        iconLink.title = description;
        people.append(iconLink);
      });
    }
    cell.append(people);
    return cell;
  }

  function render(force = false) {
    trails.forEach((trail) => {
      trail.rows = [...trail.paragraph.querySelectorAll(rowSelector)].filter(isRow);
    });
    const next = trails.map((trail) => trail.paragraph.innerHTML).join("|");
    if (!force && next === signature) return;
    signature = next;
    if (summary) summary.hidden = layout !== "original";
    function colourLink(link, gender) {
      if (!link) return;
      ["male", "female", "no-gender"].forEach((kind) => link.classList.remove("background--gender-" + kind));
      link.classList.toggle("wbe-relationship-coloured-link", options.genderColors !== false);
      if (options.genderColors !== false)
        link.classList.add(
          "background--gender-" + (gender === "Male" ? "male" : gender === "Female" ? "female" : "no-gender")
        );
    }
    ancestors.forEach((link) => colourLink(link, link.dataset.wbeGender));
    trails.forEach((trail, index) => {
      steps(trail, index).forEach((step) => {
        colourLink(step.link, step.gender);
        step.source
          ?.querySelectorAll(".wbe-relationship-spouses a")
          .forEach((link) => colourLink(link, link.dataset.wbeGender));
      });
      trail.paragraph.hidden = layout !== "original";
      trail.rows.forEach((row) => {
        const parent = [...row.querySelectorAll("a")].find(profileLink);
        parent?.classList.toggle("wbe-relationship-direct", !!options.highlightLineage);
        if (options.showStatus && !row.querySelector(".wbe-relationship-status")) {
          const status = statusFor(row);
          if (status) row.append(element(doc, "span", "wbe-relationship-status", " " + status));
        }
      });
    });
    // Record the source after adding optional labels, so our own mutations do not re-render.
    signature = trails.map((trail) => trail.paragraph.innerHTML).join("|");
    content.replaceChildren();
    if ((options.sharedAncestorBox || layout !== "original") && ancestors.length) {
      const shared = element(doc, "div", "box green rounded wbe-relationship-shared");
      shared.append(element(doc, "h4", "", direct ? "Ancestor" : "Shared ancestors"));
      ancestors.forEach((link, index) => {
        if (index) shared.append(doc.createTextNode(" and "));
        const ancestorLink = link.cloneNode(true);
        ancestorLink.classList.add("wbe-relationship-direct");
        colourLink(ancestorLink, link.dataset.wbeGender);
        shared.append(ancestorLink);
      });
      if (layout === "sideBySide") {
        trails.forEach((trail, index) => {
          shared.append(
            element(
              doc,
              "p",
              "wbe-relationship-summary",
              ancestorHeading(
                shortNames[index],
                trail.rows.length,
                ancestors.length > 1,
                ancestors[0]?.dataset.wbeGender
              ) + "."
            )
          );
        });
      }
      content.append(shared);
    }
    if (options.explainGenerations) {
      const counts = trails.map((trail) => trail.rows.length);
      const explanation = element(doc, "p", "wbe-relationship-generations");
      explanation.textContent = direct
        ? `${counts[0]} generation${counts[0] === 1 ? "" : "s"} from ${starts[0].textContent} to ${
            ancestors[0].textContent
          }.`
        : `${counts[0]} generation${counts[0] === 1 ? "" : "s"} from ${starts[0].textContent} to the shared ancestor${
            ancestors.length > 1 ? "s" : ""
          }; ${counts[1]} from ${starts[1].textContent}.`;
      if (!direct && counts.every((n) => n >= 2)) {
        const removed = Math.abs(counts[0] - counts[1]);
        explanation.append(
          doc.createTextNode(
            ` ${
              removed
                ? `“${
                    removed === 1 ? "Once removed" : removed === 2 ? "Twice removed" : `${removed} times removed`
                  }” means the paths differ by ${removed} generation${removed === 1 ? "" : "s"}.`
                : "The paths have the same number of generations."
            }`
          )
        );
      }
      content.append(explanation);
    }
    if (layout === "sideBySide") {
      const columns = element(doc, "div", "wbe-relationship-columns" + (direct ? " wbe-relationship-single-path" : ""));
      trails.forEach((trail, index) => {
        const column = element(doc, "section", "wbe-relationship-column");
        column.append(element(doc, "h4", "", `Path to ${shortNames[index]}`));
        const list = element(doc, "ol", "wbe-relationship-trail");
        const path = steps(trail, index);
        path.slice(1).forEach((step) => {
          const position = step.generation;
          const item = element(doc, "li", "wbe-relationship-step");
          const number = element(doc, "span", "wbe-relationship-generation", String(position));
          number.setAttribute("aria-label", `Generation ${position}`);
          item.append(number, personCell(step, path[position - 1]));
          list.append(item);
        });
        column.append(list);
        columns.append(column);
      });
      content.append(columns);
    }
  }

  if (options.copyReport) {
    const copy = element(doc, "button", "btn btn-secondary btn-sm", "Copy linked report");
    copy.type = "button";
    copy.addEventListener("click", async () => {
      const report = element(doc, "div", "");
      const heading = container.querySelector("h3");
      if (heading) report.append(heading.cloneNode(true));
      if (summary) {
        const copySummary = summary.cloneNode(true);
        copySummary.hidden = false;
        report.append(copySummary);
      }
      trails.forEach((trail, index) => {
        report.append(element(doc, "h4", "", starts[index].textContent));
        const list = element(doc, "ol", "");
        trail.rows.forEach((row) => {
          const item = element(doc, "li", "");
          const clone = row.cloneNode(true);
          if (clone.firstChild?.nodeType === 3)
            clone.firstChild.textContent = clone.firstChild.textContent.replace(/^\s*\d+\.\s*/, "");
          item.append(clone);
          list.append(item);
        });
        report.append(list);
      });
      report.querySelectorAll("a").forEach((link) => {
        link.setAttribute("href", link.href);
        link.removeAttribute("target");
      });
      const plain = [...report.children]
        .map((node) =>
          node.tagName === "OL"
            ? [...node.children].map((item, index) => `${index + 1}. ${item.textContent.trim()}`).join("\n")
            : node.textContent.trim()
        )
        .join("\n\n");
      try {
        const clipboard = doc.defaultView.navigator.clipboard;
        const ClipboardItem = doc.defaultView.ClipboardItem;
        if (clipboard.write && ClipboardItem) {
          await clipboard.write([
            new ClipboardItem({
              "text/html": new Blob([report.innerHTML], { type: "text/html" }),
              "text/plain": new Blob([plain], { type: "text/plain" }),
            }),
          ]);
          notice.textContent = "Report copied with profile links.";
        } else {
          await clipboard.writeText(
            plain +
              "\n\n" +
              [...report.querySelectorAll("a")].map((link) => `${link.textContent}: ${link.href}`).join("\n")
          );
          notice.textContent = "Report copied with profile URLs.";
        }
      } catch (_) {
        notice.textContent = "Could not copy. Please check clipboard access and try again.";
      }
    });
    toolbar.append(copy, notice);
  }
  select.addEventListener("change", () => {
    layout = select.value;
    render(true);
  });
  render(true);
  return {
    refresh: render,
    isCurrent: () =>
      panel.parentNode === container && trails.every((trail) => trail.paragraph.parentNode === container),
    remove: () => {
      panel.remove();
      if (header?.parentNode === container) {
        if (heading.parentNode === header) container.insertBefore(heading, header);
        header.remove();
      }
    },
  };
}
