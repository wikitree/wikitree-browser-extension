/**
 * @jest-environment jsdom
 */
import fs from "fs";
import path from "path";
import { hauntedGroups } from "./haunted_tree_data";
import { personFromProfilePage } from "./haunted_tree_page";

// Modelled on www.wikitree.com profile pages, 2026-10-19
const time = (prop, datetime) => `<time itemprop="${prop}" datetime="${datetime}"><b>${datetime}</b></time>`;
const BIRTH_1857 = `<div id="Birth" class="VITALS">Born ${time("birthDate", "1857-00-00")} in
  <span itemprop="birthPlace">Lilleshall, Shropshire, England</span></div>`;
const NO_DEATH_DATE = `<div id="Death" class="VITALS">Died <a href="/index.php?title=Special:EditPerson&u=1">[death date?]</a>
  in <span itemprop="deathPlace">Route 1066</span></div>`;
const parentCell = (side, name) =>
  `<div id="ancestor-cell-${side}" data-mid="33085085" class="tree--person"><div class="tree--placement">
    <h6 class="name"><a href="/wiki/Teese-29">${name}</a></h6></div></div>`;
const blankCell = (side) =>
  `<div id="ancestor-cell-${side}" class="tree--person"><div class="tree--placement">
    <span class="BLANK"><a href="/index.php?title=Special:EditFamily"><span class="icon--add"></span>${
      side === "f" ? "Father" : "Mother"
    }?</a></span></div></div>`;
const parents = (...cells) => `<div class="col tree--parents"><h6 class="cat">Parents</h6>${cells.join("")}</div>`;

function page(...parts) {
  return new DOMParser().parseFromString(`<html><body>${parts.join("\n")}</body></html>`, "text/html");
}

describe("personFromProfilePage dates", () => {
  test("full and year-only dates come from the datetime", () => {
    const doc = page(BIRTH_1857, `<div id="Death" class="VITALS">Died ${time("deathDate", "1920-03-04")}</div>`);
    expect(personFromProfilePage(doc)).toMatchObject({ BirthDate: "1857-00-00", DeathDate: "1920-03-04" });
  });

  test("a date line with no date is a missing date (a place doesn't count)", () => {
    const person = personFromProfilePage(page(BIRTH_1857, NO_DEATH_DATE));
    expect(person).toMatchObject({ DeathDate: "0000-00-00", DeathDateDecade: "unknown" });
    expect(hauntedGroups(person, 2026)).toEqual(["undead"]);
  });

  test("a decade is read as one", () => {
    const person = personFromProfilePage(page(`<div id="Birth" class="VITALS">Born 1850s.</div>`, NO_DEATH_DATE));
    expect(person.BirthDateDecade).toBe("1850s");
    expect(person.BirthDate).toBeUndefined();
  });

  test("dates the page doesn't show are left out", () => {
    const person = personFromProfilePage(page("<h1>Private</h1>"));
    expect(person).toEqual({ Templates: [] });
    expect(hauntedGroups(person, 2026)).toEqual([]);
  });

  test("no dates at all is a ghost", () => {
    const doc = page(
      `<div id="Birth" class="VITALS">Born <a href="/index.php?title=Special:EditPerson&u=1">[birth date?]</a></div>`,
      NO_DEATH_DATE
    );
    expect(hauntedGroups(personFromProfilePage(doc), 2026)).toEqual(["ghost"]);
  });

  test("born on 31 October", () => {
    const doc = page(`<div id="Birth" class="VITALS">Born ${time("birthDate", "1890-10-31")}</div>`);
    expect(hauntedGroups(personFromProfilePage(doc), 2026)).toContain("halloween");
  });
});

describe("personFromProfilePage parents", () => {
  test("two blank parent cells: no parents", () => {
    const person = personFromProfilePage(page(BIRTH_1857, parents(blankCell("f"), blankCell("m"))));
    expect(person).toMatchObject({ Father: 0, Mother: 0 });
    expect(hauntedGroups(person, 2026)).toContain("headless");
  });

  test("one parent is enough", () => {
    const person = personFromProfilePage(page(parents(parentCell("f", "Richard Teese"), blankCell("m"))));
    expect(person.Father).toBeUndefined();
    expect(person.Mother).toBeUndefined();
  });

  test("no Ancestors tab: parents unknown, not missing", () => {
    expect(personFromProfilePage(page(BIRTH_1857)).Father).toBeUndefined();
  });

  test("a parent the member can't see isn't a missing one", () => {
    const doc = page(
      parents(blankCell("f"), blankCell("m")),
      `<div id="nVitals">Son of [private father (1930s - unknown)] and [private mother (1930s - unknown)]</div>`
    );
    expect(personFromProfilePage(doc).Father).toBeUndefined();
  });
});

describe('personFromProfilePage connected (the "degrees from" line, live 2026-10-20)', () => {
  const MATCHES = `<section id="Matches"><h2>Matches and Merges</h2></section>`;
  const CHECKERS = `<section><div class="container"><div class="row pb-4"><div class="col"><p>
    <a href="https://www.wikitree.com/g2g/2095858/play-this-weeks-explorers-connection-checkers-game"><b>Explorers</b>
    Connection Checkers</a>: Elisabeth is <a href="/index.php?title=Special:Connection&action=connect&person1Name=Joliet-16&person2Name=De_Villiers-279">16 degrees from Louis Jolliet</a></p></div></div></div></section>`;

  test("with the line: connected", () => {
    const person = personFromProfilePage(page(BIRTH_1857, MATCHES, CHECKERS));
    expect(person.Connected).toBe(1);
    expect(hauntedGroups(person, 2026)).not.toContain("lonewolf");
  });

  test("without it: a Lone wolf", () => {
    const person = personFromProfilePage(page(BIRTH_1857, MATCHES));
    expect(person.Connected).toBe(0);
    expect(hauntedGroups(person, 2026)).toContain("lonewolf");
  });

  test("a page without the bottom sections says nothing about it", () => {
    expect(personFromProfilePage(page(BIRTH_1857)).Connected).toBeUndefined();
  });
});

test("a project account's page (WikiTree-N) gets no icons", () => {
  const doc = page(
    `<div id="pageData" data-mnamedb="WikiTree-11" data-mid="1"></div>`,
    parents(blankCell("f"), blankCell("m"))
  );
  expect(personFromProfilePage(doc).Name).toBe("WikiTree-11");
  expect(hauntedGroups(personFromProfilePage(doc), 2026)).toEqual([]);
});

describe("personFromProfilePage templates", () => {
  test("{{Unsourced}} shows as the Unsourced Profiles category", () => {
    const doc = page(
      `<div class="CATEGORIES"><a href="/wiki/Category:Unsourced_Profiles">Unsourced Profiles</a></div>`
    );
    expect(hauntedGroups(personFromProfilePage(doc), 2026)).toEqual(["skeleton"]);
  });

  test("the menu's Unsourced Profiles link isn't the category", () => {
    const doc = page(`<a href="/index.php?title=Category:Unsourced%20Profiles&u=32781187">Unsourced Profiles</a>`);
    expect(personFromProfilePage(doc).Templates).toEqual([]);
  });
});

test("a saved real profile page (older Ancestors markup, with both parents)", () => {
  // (jest runs from the repo root)
  const html = fs.readFileSync(path.resolve(process.cwd(), "src/testing/pages/Tolkien-1.html"), "utf8");
  const doc = new DOMParser().parseFromString(html, "text/html");
  expect(personFromProfilePage(doc)).toEqual({
    Name: "Tolkien-1",
    BirthDate: "1892-01-03",
    DeathDate: "1973-09-02",
    Templates: [],
    Connected: 1, // "J. R. R. is 28 degrees from Quincy Jones, ..." (no Connection Checkers name in 2025)
  });
});
