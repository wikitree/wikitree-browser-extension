import {
  cleanDate,
  formatDisplayName,
  parseName,
  parseCoordinates,
  parseMemorialDocument,
  parseBirthDeathDates,
  parseListRow,
  parseRecordCount,
} from "./fg_memorial_parser";

// Markup trimmed from real pages in Fairview Presbyterian Cemetery (cemetery 2236958)
function listRow(id, slug, nameHtml, dates, plot, withPhoto = true) {
  const picture = withPhoto
    ? `<figure class="pic-wrapper"><img src="x.jpg" alt=""></figure>`
    : `<figure class="pic-wrapper"><span class="icon-findagrave" aria-label="No Grave Photo"></span></figure><small>No grave photo</small>`;
  const plotHtml = plot
    ? `<p class="addr-cemet mb-1"><span class="text-muted">Plot info:</span> <strong>${plot}</strong></p>`
    : "";
  const wrapper = document.createElement("div");
  wrapper.innerHTML = `<div class="memorial-item row" id="sr-${id}">
    <a href="/memorial/${id}/${slug}"><div class="memorial-item-pic">${picture}</div>
    <h2 class="name-grave d-flex"><i class="pe-2 text-break">${nameHtml}</i><b class="icon icon-flowers"></b></h2>
    <b class="birthDeathDates fw-light">${dates}</b></a>
    <div class="memorial-item---cemet">${plotHtml}</div></div>`;
  return wrapper.firstElementChild;
}

function nameEl(html) {
  const el = document.createElement("h1");
  el.innerHTML = html;
  return el;
}

describe("parseName", () => {
  test("plain given and surname", () => {
    expect(parseName(nameEl("Maximiliano Apodaca"))).toEqual({
      givenNames: "Maximiliano",
      maidenName: "",
      surname: "Apodaca",
    });
  });

  test("italic text is the maiden name, quotes are a nickname", () => {
    expect(parseName(nameEl("Amalia “Mollie” <i>Gonzales</i> Casados  "))).toEqual({
      givenNames: "Amalia",
      maidenName: "Gonzales",
      surname: "Casados",
    });
  });

  test("middle names stay in the given names", () => {
    const parsed = parseName(nameEl("Rachel Ann <i>Martinez</i> Casteneda"));
    expect(parsed.givenNames).toBe("Rachel Ann");
    expect(parsed.maidenName).toBe("Martinez");
    expect(parsed.surname).toBe("Casteneda");
  });

  test("a single word is a surname", () => {
    expect(parseName(nameEl("Bunker  "))).toEqual({ givenNames: "", maidenName: "", surname: "Bunker" });
  });

  test("a suffix is not the surname", () => {
    expect(parseName(nameEl("Jose H Chavez Jr")).surname).toBe("Chavez");
    expect(parseName(nameEl("Jose H Chavez Jr")).givenNames).toBe("Jose H");
    expect(parseName(nameEl("Anna <i>Lee</i> Smith III")).surname).toBe("Smith");
  });

  test("a lone V is an initial, not a suffix", () => {
    expect(parseName(nameEl("Mary V"))).toEqual({ givenNames: "Mary", maidenName: "", surname: "V" });
    expect(parseName(nameEl("Anna V Smith")).givenNames).toBe("Anna V");
  });

  test("particles stay with the surname", () => {
    expect(parseName(nameEl("Maria De La Cruz"))).toEqual({
      givenNames: "Maria",
      maidenName: "",
      surname: "De La Cruz",
    });
    expect(parseName(nameEl("Jan van der Berg"))).toEqual({
      givenNames: "Jan",
      maidenName: "",
      surname: "van der Berg",
    });
    expect(parseName(nameEl("Mary St. John Jr."))).toEqual({ givenNames: "Mary", maidenName: "", surname: "St. John" });
    expect(parseName(nameEl("Ana Maria del Rio"))).toEqual({
      givenNames: "Ana Maria",
      maidenName: "",
      surname: "del Rio",
    });
  });

  test("the first word is always a given name, even if it looks like a particle", () => {
    expect(parseName(nameEl("Della Smith"))).toEqual({ givenNames: "Della", maidenName: "", surname: "Smith" });
    expect(parseName(nameEl("Van Dyke"))).toEqual({ givenNames: "Van", maidenName: "", surname: "Dyke" });
  });

  test("a prefix span is ignored", () => {
    const parsed = parseName(nameEl('<span class="prefix">Dr.</span> John Smith'));
    expect(parsed.givenNames).toBe("John");
    expect(parsed.surname).toBe("Smith");
  });

  test("only a birth surname: it is also the surname", () => {
    const parsed = parseName(nameEl("Mary <i>Smith</i>"));
    expect(parsed.maidenName).toBe("Smith");
    expect(parsed.surname).toBe("Smith");
    expect(parsed.givenNames).toBe("Mary");
  });

  test("multi-word maiden and married surnames", () => {
    const parsed = parseName(nameEl("Maria <i>De La Cruz</i> Garcia Lopez"));
    expect(parsed.maidenName).toBe("De La Cruz");
    expect(parsed.surname).toBe("Garcia Lopez");
  });

  test("missing element gives blanks", () => {
    expect(parseName(null).surname).toBe("");
  });
});

describe("cleanDate", () => {
  test("strips the age and treats unknown as blank", () => {
    expect(cleanDate("24 Apr 1979 (aged 51)")).toBe("24 Apr 1979");
    expect(cleanDate("unknown")).toBe("");
    expect(cleanDate("  1879 ")).toBe("1879");
  });
});

describe("parseCoordinates", () => {
  test("reads the Google Maps link", () => {
    expect(parseCoordinates("http://maps.google.com/maps?q=36.9050917,-104.4237222&spn=0.004205,0.005249")).toEqual({
      latitude: "36.9050917",
      longitude: "-104.4237222",
    });
  });

  test("no coordinates", () => {
    expect(parseCoordinates("/memorial/24170747/edit#gps-location")).toEqual({ latitude: "", longitude: "" });
    expect(parseCoordinates("")).toEqual({ latitude: "", longitude: "" });
    expect(parseCoordinates(undefined)).toEqual({ latitude: "", longitude: "" });
  });
});

describe("parseMemorialDocument", () => {
  const html = (body) => new DOMParser().parseFromString(`<html><body>${body}</body></html>`, "text/html");

  test("full memorial", () => {
    const doc = html(`
      <h1 id="bio-name" itemprop="name">Amalia “Mollie” <i>Gonzales</i> Casados  </h1>
      <span id="memNumberLabel">24170759</span>
      <time id="birthDateLabel">23 Feb 1928</time>
      <time id="deathDateLabel">24 Apr 1979 (aged 51)</time>
      <span id="plotValueLabel">B-163</span>
      <a href="http://maps.google.com/maps?q=36.9050917,-104.4237222&amp;spn=0.004205,0.005249" id="gpsValue">Show Map</a>`);
    expect(parseMemorialDocument(doc)).toEqual({
      givenNames: "Amalia",
      maidenName: "Gonzales",
      surname: "Casados",
      birthDate: "23 Feb 1928",
      deathDate: "24 Apr 1979",
      plot: "B-163",
      latitude: "36.9050917",
      longitude: "-104.4237222",
    });
  });

  test("memorial with nothing but a name and a death date", () => {
    const doc = html(`
      <h1 id="bio-name">Bunker  </h1>
      <span id="memNumberLabel">24170747</span>
      <time id="birthDateLabel">unknown</time>
      <time id="deathDateLabel">15 Oct 1956</time>
      <a href="/memorial/24170747/edit#gps-location" id="gpsValue">Add to Map</a>`);
    const parsed = parseMemorialDocument(doc);
    expect(parsed.surname).toBe("Bunker");
    expect(parsed.givenNames).toBe("");
    expect(parsed.birthDate).toBe("");
    expect(parsed.deathDate).toBe("15 Oct 1956");
    expect(parsed.plot).toBe("");
    expect(parsed.latitude).toBe("");
  });

  test("an empty document does not throw", () => {
    expect(parseMemorialDocument(html("")).surname).toBe("");
  });
});

describe("parseBirthDeathDates", () => {
  test("variations seen in lists", () => {
    expect(parseBirthDeathDates("31 Jan 1893 – 22 Oct 1938")).toEqual({
      birthDate: "31 Jan 1893",
      deathDate: "22 Oct 1938",
    });
    expect(parseBirthDeathDates("unknown – 15 Oct 1956")).toEqual({ birthDate: "", deathDate: "15 Oct 1956" });
    expect(parseBirthDeathDates("1879 – 1965")).toEqual({ birthDate: "1879", deathDate: "1965" });
    expect(parseBirthDeathDates("unknown")).toEqual({ birthDate: "", deathDate: "" });
  });
});

describe("parseListRow", () => {
  test("row with maiden name and plot", () => {
    const row = parseListRow(
      listRow(
        "24170759",
        "amalia-casados",
        "Amalia “Mollie” <i>Gonzales</i> Casados",
        "23 Feb 1928 – 24 Apr 1979",
        "B-163"
      )
    );
    expect(row).toMatchObject({
      memorialId: "24170759",
      givenNames: "Amalia",
      maidenName: "Gonzales",
      surname: "Casados",
      birthDate: "23 Feb 1928",
      deathDate: "24 Apr 1979",
      plot: "B-163",
      hasPhoto: "Y",
      hasGravePhoto: "Y",
    });
    expect(row.memorialLink).toMatch(/\/memorial\/24170759\/amalia-casados$/);
  });

  test("row with no photo and no plot", () => {
    const row = parseListRow(
      listRow("288602485", "x", "Berside <i>Maes</i> Cordova", "23 May 1885 – 25 Nov 1938", "", false)
    );
    expect(row.plot).toBe("");
    expect(row.hasPhoto).toBe("N");
    expect(row.hasGravePhoto).toBe("N");
    expect(row.givenNames).toBe("Berside");
    expect(row.maidenName).toBe("Maes");
    expect(row.surname).toBe("Cordova");
  });
});

describe("parseRecordCount", () => {
  test("reads the list header", () => {
    expect(parseRecordCount("\n   47 matching records found\n  ")).toBe(47);
    expect(parseRecordCount("1,234 matching records found")).toBe(1234);
    expect(parseRecordCount("1 matching record found")).toBe(1);
  });

  test("anything else is null", () => {
    expect(parseRecordCount("Fairview Presbyterian Cemetery Memorials")).toBeNull();
    expect(parseRecordCount("")).toBeNull();
    expect(parseRecordCount(undefined)).toBeNull();
  });
});

describe("formatDisplayName", () => {
  test("keeps the nickname, puts the maiden name in brackets", () => {
    expect(formatDisplayName(nameEl("Amalia “Mollie” <i>Gonzales</i> Casados"))).toBe(
      "Amalia “Mollie” (Gonzales) Casados"
    );
  });

  test("puts the title first and keeps the suffix", () => {
    expect(formatDisplayName(nameEl('John <span class="prefix">Dr.</span> Smith Jr.'))).toBe("Dr. John Smith Jr.");
  });

  test("plain names, and no element", () => {
    expect(formatDisplayName(nameEl("Bunker  "))).toBe("Bunker");
    expect(formatDisplayName(null)).toBe("");
  });

  test("a list row carries it", () => {
    const row = parseListRow(
      listRow(
        "24170759",
        "amalia-casados",
        "Amalia “Mollie” <i>Gonzales</i> Casados",
        "23 Feb 1928 – 24 Apr 1979",
        "B-163"
      )
    );
    expect(row.displayName).toBe("Amalia “Mollie” (Gonzales) Casados");
    expect(row.givenNames).toBe("Amalia");
  });
});
