import { englishCountry, historicalPlace, plainName } from "./chat_historical_places";
import { cachedPoint, geocodeLocations, isGeocodable, pickHistoricalTown, pickWikidataTown, wikidataTowns } from "./chat_geocode";
import { buildMigration, placeOf, placeRegion } from "./chat_migration_data";

// 2026-10-23: Russian Empire ancestors weren't on the map (Friesen-1686).
describe("birthplaces in states that no longer exist", () => {
  test("Friesen-1686: the province, in Ukraine, and the town looked up there", () => {
    expect(historicalPlace("Ekaterinoslav, Yekaterinoslav, Russian Empire")).toEqual({
      key: "Yekaterinoslav",
      country: "Ukraine",
      point: [36, 48.1],
      query: "ekaterinoslav, ukraine",
      box: [17, 35, 180, 78],
      near: [36, 48.1],
      km: 300,
      town: "ekaterinoslav",
    });
  });

  // (her family's own birthplaces, 2026-10-23)
  test("as the Mennonites write them", () => {
    expect(historicalPlace("Nikolaifeld, Yazykovo, Chortitza Mennonite Colony, Yekaterinoslav, Russian Empire")).toMatchObject({ key: "Chortitza", query: "nikolaifeld, ukraine" });
    expect(historicalPlace("Chortitza Mennonite Settlement, Yekaterinoslav, Yekaterinoslav, Russian Empire")).toMatchObject({ key: "Chortitza", query: "" });
    expect(historicalPlace("Muntau, Molotschna Colony, Taurida, Russian Empire")).toMatchObject({ key: "Molotschna", query: "muntau, ukraine", near: [35.5, 47.15], km: 70 });
    expect(historicalPlace("Blumengart, Chortitza, South Russia")).toMatchObject({ key: "Chortitza", query: "blumengart, ukraine" });
    expect(historicalPlace("South Russia")).toMatchObject({ key: "South Russia", country: "Ukraine", point: [34, 47.3] });
    expect(historicalPlace("Nikolaifeld, Yazykovo, Ukraine, Russia")).toMatchObject({ key: "Ukraine", query: "nikolaifeld, ukraine" });
  });

  test("a province that was never anything else stands for its state", () => {
    expect(historicalPlace("Danzig, West Prussia")).toMatchObject({ key: "West Prussia", country: "Poland", query: "danzig, poland", box: [5.8, 49, 23, 56] });
    expect(historicalPlace("Elbing, Elbing, West Prussia")).toMatchObject({ key: "West Prussia", query: "elbing, poland" });
    expect(historicalPlace("Mitau, Courland")).toMatchObject({ key: "Courland", country: "Latvia" });
    expect(historicalPlace("Kishinev, Bessarabia")).toMatchObject({ key: "Bessarabia", country: "Moldova" });
  });

  test("a province now split between countries: the town alone, near it", () => {
    expect(historicalPlace("Riga, Livonia, Russian Empire")).toMatchObject({ key: "Livonia", country: "", query: "riga", near: [25.5, 57.8] });
    expect(historicalPlace("Lemberg, Galizien, Österreich-Ungarn")).toMatchObject({ key: "Galicia", country: "", query: "lemberg" });
  });

  test("the state alone: its own dot, the town looked for anywhere in it", () => {
    expect(historicalPlace("Riga, Russian Empire")).toMatchObject({ key: "Russian Empire", country: "", query: "riga", near: null });
    expect(historicalPlace("Russian Empire")).toMatchObject({ key: "Russian Empire", query: "" });
    // (in Russian, 2026-10-22)
    expect(historicalPlace("Российская империя")).toMatchObject({ key: "Russian Empire" });
    expect(historicalPlace("Zagreb, Kingdom of Serbs, Croats and Slovenes")).toMatchObject({ key: "Yugoslavia", query: "zagreb" });
    expect(historicalPlace("Vilnius, Polish-Lithuanian Commonwealth")).toMatchObject({ key: "Polish–Lithuanian Commonwealth", query: "vilnius" });
  });

  test("states inside states, and the ways they're written", () => {
    expect(historicalPlace("Danzig, Westpreußen, Preußen, Deutsches Reich")).toMatchObject({ key: "West Prussia", country: "Poland", query: "danzig, poland" });
    expect(historicalPlace("Warsaw, Warsaw Governorate, Kingdom of Poland, Russian Empire")).toMatchObject({ key: "Warsaw", country: "Poland", query: "warsaw, poland" });
    expect(historicalPlace("Vinnytsia, Ukrainian SSR, USSR")).toMatchObject({ key: "Ukraine", country: "Ukraine", point: null, query: "vinnytsia, ukraine" });
    // (Kyiv is also the governorate's name: the town, near it)
    expect(historicalPlace("Kyiv, Ukrainian SSR, USSR")).toMatchObject({ key: "Kiev", country: "Ukraine", query: "kyiv, ukraine" });
    expect(historicalPlace("Prague, Bohemia, Holy Roman Empire")).toMatchObject({ key: "Bohemia", country: "Czechia" });
    expect(historicalPlace("Bratislava, Slovakia, Czechoslovakia")).toMatchObject({ key: "Slovakia", country: "Slovakia", query: "bratislava, slovakia" });
    expect(historicalPlace("Urfa, Ottoman Empire")).toMatchObject({ key: "Ottoman Empire", query: "urfa", box: [15, 12, 50, 46.5] });
    expect(historicalPlace("Harput, Ottoman Empire")).toMatchObject({ key: "Harput", country: "Turkey", query: "" });
    expect(historicalPlace("Zahle, Mount Lebanon Mutasarrifate, Ottoman Empire")).toMatchObject({ key: "Mount Lebanon", country: "Lebanon", query: "zahle, lebanon" });
  });

  test("today's country written for an old province that's now elsewhere", () => {
    expect(historicalPlace("Chortitza, Yekaterinoslav, Russia")).toMatchObject({ key: "Chortitza", country: "Ukraine", query: "" });
    expect(historicalPlace("Ekaterinoslav, Yekaterinoslav, Russia")).toMatchObject({ key: "Yekaterinoslav", country: "Ukraine", query: "ekaterinoslav, ukraine" });
    expect(historicalPlace("Königsberg, Ostpreußen, Deutschland")).toMatchObject({ key: "East Prussia", country: "" });
    expect(historicalPlace("Lemberg, Galicia, Austria")).toMatchObject({ key: "Galicia" });
    expect(historicalPlace("Riga, Latvia, Russia")).toMatchObject({ key: "Latvia", country: "Latvia", query: "riga, latvia" });
  });

  test("places that are where they say: left alone", () => {
    for (const location of [
      "Moscow, Russia",
      "Kolomna, Moscow, Russia",
      "Saint Petersburg, Russia",
      "Innsbruck, Tirol, Österreich",
      "Munich, Bavaria, Germany",
      "Istanbul, Turkey",
      "Rhineland, Manitoba, Canada",
      "Santiago de Compostela, Galicia, Spain",
      "Lviv, Ukraine",
      "Wem, Shropshire, England",
      "Stogi, Pomerania, Poland (Heubuden, Gross Werder, Prussia)",
      "Livonia, Wayne, Michigan, USA",
      "",
    ]) {
      expect([location, historicalPlace(location)]).toEqual([location, null]);
    }
  });

  test("a city named after its province: the first part is the town", () => {
    expect(historicalPlace("Kiev, Kiev, Russian Empire")).toMatchObject({ key: "Kiev", query: "kiev, ukraine" });
    expect(historicalPlace("Kiev, Russian Empire")).toMatchObject({ key: "Kiev", query: "" });
  });

  test("names compare without accents, ß or dotless i", () => {
    expect(plainName("Preußen")).toBe("preussen");
    expect(plainName("Osmanlı İmparatorluğu")).toBe("osmanli imparatorlugu");
    expect(plainName("Łomża")).toBe("lomza");
  });
});

// 2026-10-23: renamed villages like Chortitza, Blumengart and Neuendorf, map-only. OpenStreetMap has
// none of them by those names (chat_colony_villages).
describe("the villages of the Mennonite mother colonies", () => {
  test("Friesen-1686: each village its own dot, with nothing to look up", () => {
    expect(historicalPlace("Neuendorf Village, Chortitza Mennonite Colony, Yekaterinoslav, Russian Empire")).toEqual({
      key: "Neuendorf (Chortitza)",
      country: "Ukraine",
      point: [34.9013, 47.9114],
      query: "",
      box: [17, 35, 180, 78],
      near: [34.9013, 47.9114],
      km: 10,
      town: "neuendorf",
    });
    expect(historicalPlace("Rosengart Village, Chortitza Mennonite Colony, Yekaterinoslav, Yekaterinoslav, Russian Empire")).toMatchObject({ key: "Rosengart (Chortitza)", point: [35.0098, 47.8106] });
    expect(historicalPlace("Neuenburg Village, Chortitza Mennonite Colony, Yekaterinoslav, Yekaterinoslav, Russian Empire")).toMatchObject({ key: "Neuenburg (Chortitza)", point: [34.9915, 47.939] });
    expect(historicalPlace("Halbstadt, Molotschna Colony, Taurida, Russian Empire")).toMatchObject({ key: "Halbstadt (Molotschna)", country: "Ukraine", query: "" });
    // (part of Molochansk now: Halbstadt's point, its own name; 2026-10-23)
    expect(historicalPlace("Neuhalbstadt, Molotschna, Taurida, Russian Empire")).toMatchObject({ key: "Neu-Halbstadt (Molotschna)", point: [35.5985, 47.2038], query: "" });
  });

  test("Chortitza the village is the colony's dot", () => {
    for (const location of ["Chortitza, Yekaterinoslav, Yekaterinoslav, Russian Empire", "Chortitza Mennonite Colony, Yekaterinoslav, Russian Empire"]) {
      expect([location, historicalPlace(location)]).toEqual([location, expect.objectContaining({ key: "Chortitza", point: [35.0116, 47.8615], query: "" })]);
    }
  });

  test("however they're spelt", () => {
    for (const [location, key] of [
      ["Rosenhart, Chortitza, South Russia", "Rosengart (Chortitza)"],
      ["Kronstal, Chortitza, Yekaterinoslav, Russian Empire", "Kronsthal (Chortitza)"],
      ["Schoenhorst, Yekaterinoslav, Russian Empire", "Schönhorst (Chortitza)"],
      ["Ladekop, Molotschna, Taurida, Russian Empire", "Ladekopp (Molotschna)"],
      ["Rückenau, South Russia", "Rückenau (Molotschna)"],
      ["Neu-Osterwick, Chortitza", "Osterwick (Chortitza)"],
    ]) {
      expect([location, historicalPlace(location)?.key]).toEqual([location, key]);
    }
  });

  test("Blumengart has no point anywhere: the colony's dot, still looked up", () => {
    expect(historicalPlace("Blumengart Village, Chortitza Mennonite Colony, Yekaterinoslav, Russian Empire")).toMatchObject({ key: "Chortitza", query: "blumengart, ukraine" });
  });

  test("only in the colony, its governorate, or Russia with no province", () => {
    expect(historicalPlace("Rosenthal, Hesse, Germany")).toBeNull();
    expect(historicalPlace("Tiegenhagen, Gross Werder, Prussia")).toMatchObject({ key: "Prussia", query: "tiegenhagen" });
    expect(historicalPlace("Halbstadt, Kherson, Russian Empire")).toMatchObject({ key: "Kherson", query: "halbstadt, ukraine" });
    expect(historicalPlace("Rosenthal, Russian Empire")).toMatchObject({ key: "Rosenthal (Chortitza)" });
  });
});

describe("on the map", () => {
  test("the province is the dot until the town is found; moves go province to province", () => {
    expect(placeRegion("Chortitza, Yekaterinoslav, Yekaterinoslav, Russian Empire")).toEqual({ key: "Chortitza", country: "Ukraine", regionPoint: [35.0116, 47.8615] });
    expect(placeRegion("Odesa, Ukraine, USSR")).toEqual({ key: "Ukraine", country: "Ukraine" });
    const slots = [
      null,
      { name: "Aganetha", birthLocation: "Rhineland, Manitoba, Canada", birth: "1880" },
      { name: "Father", birthLocation: "Berdyansk, Taurida, Russian Empire", birth: "1850" },
      { name: "Mother", birthLocation: "Chortitza, Yekaterinoslav, Yekaterinoslav, Russian Empire", birth: "1852" },
    ];
    const migration = buildMigration(slots, () => null);
    expect(migration.flows.map((flow) => `${flow.from}→${flow.to}`).sort()).toEqual(["Chortitza→Manitoba", "Taurida→Manitoba"]);
    // (a town found later keeps the province's country for the map's colouring)
    expect(placeOf("Berdyansk, Taurida, Russian Empire", () => ({ name: "Berdiansk", country: "Ukraine", point: [36.785, 46.757] }))).toEqual({
      key: "Berdiansk",
      country: "Ukraine",
      point: [36.785, 46.757],
      region: "Taurida",
    });
  });

  test("an aside in brackets, and today's countries in their own languages", () => {
    expect(placeRegion("Stogi, Pomerania, Poland (Heubuden, Gross Werder, Prussia)")).toEqual({ key: "Poland", country: "Poland" });
    expect(placeRegion("Danzig, Königliches Preußen, Polen")).toEqual({ key: "Poland", country: "Poland" });
    expect(placeRegion("Wien, Österreich")).toEqual({ key: "Austria", country: "Austria" });
    expect(placeRegion("Moskva, Россия")).toEqual({ key: "Russia", country: "Russia" });
    expect(englishCountry("Lettland")).toBe("Latvia");
    expect(englishCountry("Latvia")).toBe("");
    expect(englishCountry("Georgia")).toBe("");
  });

  test("worth a lookup only when there's a town", () => {
    expect(isGeocodable("Blumengart, Chortitza, Yekaterinoslav, Russian Empire")).toBe(true);
    expect(isGeocodable("Chortitza, Yekaterinoslav, Russian Empire")).toBe(false);
    expect(isGeocodable("Yekaterinoslav, Russian Empire")).toBe(false);
    expect(isGeocodable("Russian Empire")).toBe(false);
  });
});

describe("looking up a town in a state that no longer exists", () => {
  // (Halbstadt itself is in the colony table now: a Taurida town that isn't)
  const taurida = historicalPlace("Berdyansk, Taurida, Russian Empire");

  test("by any of its names, inside the state, near the province", () => {
    const berdiansk = { name: "Berdiansk", settlement: true, point: [36.785, 46.757], names: ["Бердянськ", "Berdiansk", "Berdyansk"] };
    const czech = { name: "Berdyansk", settlement: true, point: [16.13, 50.6] };
    const farOff = { name: "Berdyansk", settlement: true, point: [44, 51] };
    expect(pickHistoricalTown([czech, farOff, berdiansk], taurida)).toBe(berdiansk);
    expect(pickHistoricalTown([czech, farOff], taurida)).toBeNull();
    expect(pickHistoricalTown([{ ...berdiansk, names: [] }], taurida)).toBeNull();
    // (no province: the first in the state)
    const riga = { name: "Riga", settlement: true, point: [24.105, 56.949] };
    expect(pickHistoricalTown([{ name: "Riga", settlement: true, point: [-77.9, 43.08] }, riga], historicalPlace("Riga, Russian Empire"))).toBe(riga);
  });

  test("Photon in today's country first, then Nominatim with every name", async () => {
    jest.useFakeTimers();
    const location = "Berdyansk, Taurida, Russian Empire";
    const urls = [];
    global.fetch = jest.fn(async (url) => {
      urls.push(String(url));
      const json = /photon/.test(url)
        ? { features: [{ properties: { name: "Berdyansk", osm_value: "village", country: "Czechia" }, geometry: { coordinates: [16.13, 50.6] } }] }
        : [{ name: "Berdiansk", addresstype: "city", lat: "46.757", lon: "36.785", address: { country: "Ukraine", state: "Zaporizhzhia Oblast" }, namedetails: { name: "Бердянськ", "name:en": "Berdiansk", "name:ru": "Бердянск", old_name: "Berdyansk" } }];
      return { ok: true, status: 200, json: async () => json };
    });
    try {
      const { fast, done } = geocodeLocations([location]);
      await fast;
      expect(cachedPoint(location)).toBeNull();
      await jest.advanceTimersByTimeAsync(5000);
      await done;
      expect(cachedPoint(location)).toEqual({ name: "Berdiansk", area: "Zaporizhzhia Oblast", country: "Ukraine", point: [36.785, 46.757] });
      const [photon, nominatim, ...more] = urls;
      expect(more).toEqual([]);
      expect(decodeURIComponent(photon)).toContain("&bbox=17,35,180,78&lon=34.5&lat=46.2&q=berdyansk, ukraine");
      expect(decodeURIComponent(nominatim)).toContain("&viewbox=17,35,180,78&bounded=1&namedetails=1&q=berdyansk, ukraine");
    } finally {
      jest.useRealTimers();
    }
  });
});

// (Prischib, a German colony by Molotschna, is Pryshyb now: Wikidata has the old name, OpenStreetMap
// doesn't; the items as Wikidata gave them, 2026-10-23, trimmed)
describe("Wikidata, when OpenStreetMap doesn't know the old name", () => {
  const prischib = historicalPlace("Prischib, Taurida, Russian Empire");
  const point = (lon, lat) => ({ mainsnak: { datavalue: { value: { longitude: lon, latitude: lat } } } });
  const kind = (id) => ({ mainsnak: { datavalue: { value: { id } } } });
  const entities = {
    Q4301016: { labels: { ru: { value: "Молочная" } }, claims: { P625: [point(35.33333333, 47.25)], P31: [kind("Q4022")] } },
    Q2027426: { labels: { en: { value: "Pryshyb" }, uk: { value: "Пришиб" } }, aliases: { de: [{ value: "Prischib" }] }, claims: { P625: [point(35.323893013946, 47.256379049125)], P31: [kind("Q4100864")] } },
  };

  test("an item called that, by any of its names, near the province; not a river", () => {
    expect(wikidataTowns(entities, "Ukraine")).toEqual([
      { name: "Молочная", area: "", country: "Ukraine", point: [35.3333, 47.25], settlement: false, names: ["Молочная"] },
      { name: "Pryshyb", area: "", country: "Ukraine", point: [35.3239, 47.2564], settlement: true, names: ["Pryshyb", "Пришиб", "Prischib"] },
    ]);
    expect(pickWikidataTown(wikidataTowns(entities, "Ukraine"), prischib)).toMatchObject({ name: "Pryshyb" });
    // (exactly that name: Neu-Prischib isn't Prischib)
    expect(pickWikidataTown(wikidataTowns(entities, "Ukraine"), historicalPlace("Neu-Prischib, Taurida, Russian Empire"))).toBeNull();
    expect(pickWikidataTown(wikidataTowns(entities, "Ukraine"), historicalPlace("Prischib, Kiev, Russian Empire"))).toBeNull();
  });

  test("after Photon and Nominatim miss, and only then", async () => {
    jest.useFakeTimers();
    const location = "Prischib, Taurida, Russian Empire";
    const calls = [];
    global.fetch = jest.fn(async (url, options) => {
      calls.push([String(url), options?.headers?.["Api-User-Agent"]]);
      const json = /photon/.test(url) ? { features: [] } : /nominatim/.test(url) ? [] : /list=search/.test(url) ? { query: { search: [{ title: "Q4301016" }, { title: "Q2027426" }] } } : { entities };
      return { ok: true, status: 200, json: async () => json };
    });
    try {
      const { done } = geocodeLocations([location]);
      await jest.advanceTimersByTimeAsync(10000);
      await done;
      expect(cachedPoint(location)).toEqual({ name: "Pryshyb", area: "", country: "Ukraine", point: [35.3239, 47.2564] });
      const [photon, nominatim, search, items, ...more] = calls.map(([url]) => decodeURIComponent(url));
      expect(more).toEqual([]);
      expect(photon).toContain("photon");
      expect(nominatim).toContain("nominatim");
      expect(search).toContain("www.wikidata.org/w/api.php?action=query&list=search&srlimit=10&srsearch=prischib nearcoord:300km,46.2,34.5&format=json&origin=*");
      expect(items).toContain("action=wbgetentities&props=labels|aliases|claims&ids=Q4301016|Q2027426");
      expect(calls[2][1]).toMatch(/github\.com\/wikitree\/wikitree-browser-extension/);
    } finally {
      jest.useRealTimers();
    }
  });
});

test("the saved lookups of v7 are kept, except in states that no longer exist", async () => {
  const stored = {
    museGeocodeCache7: {
      "wem, shropshire, england": { name: "Wem", point: [-2.72, 52.86] },
      "blumengart, chortitza, yekaterinoslav, russian empire": 0,
    },
  };
  const removed = [];
  let saved = null;
  global.chrome = {
    storage: {
      local: {
        get: (keys, callback) => callback(Object.fromEntries(keys.filter((key) => key in stored).map((key) => [key, stored[key]]))),
        remove: (keys) => removed.push(...keys),
        set: (value) => (saved = value),
      },
    },
  };
  jest.useFakeTimers();
  try {
    let geocode;
    jest.isolateModules(() => {
      geocode = require("./chat_geocode");
    });
    await geocode.loadGeocodeCache();
    expect(geocode.cachedPoint("Wem, Shropshire, England")).toMatchObject({ name: "Wem" });
    expect(geocode.pendingLookups(["Wem, Shropshire, England", "Blumengart, Chortitza, Yekaterinoslav, Russian Empire"])).toBe(1);
    expect(removed).toContain("museGeocodeCache7");
    jest.advanceTimersByTime(2000);
    expect(Object.keys(saved.museGeocodeCache8)).toEqual(["wem, shropshire, england"]);
  } finally {
    jest.useRealTimers();
    delete global.chrome;
  }
});
