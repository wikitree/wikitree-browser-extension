import { cachedPoint, distanceKm, geocodeLocations, geocodeQueries, isGeocodable, locationKey, namesMatch, parentCountyName, pendingLookups, pickParentCounty, pickPhotonCounty, pickPhotonTown, pickTown, pickWholeCounty, setCachedPoint } from "./chat_geocode";
import { buildMigration, placeOf } from "./chat_migration_data";

describe("town lookups for the migration map", () => {
  test("keys and which locations are worth a lookup", () => {
    expect(locationKey(" Wem,Shropshire ,  England (probably) ")).toBe("wem, shropshire, england");
    expect(isGeocodable("Wem, Shropshire, England")).toBe(true);
    expect(isGeocodable("England")).toBe(false);
    expect(isGeocodable("")).toBe(false);
  });

  test("a looked-up town becomes its own place; others stay regions", () => {
    setCachedPoint("Wem, Shropshire, England", { name: "Wem", area: "Shropshire", country: "United Kingdom", point: [-2.7241, 52.8556] });
    setCachedPoint("Birkenhead, Cheshire, England", { name: "Birkenhead", area: "Wirral", country: "United Kingdom", point: [-3.0145, 53.3934] });
    expect(placeOf("Wem, Shropshire, England")).toEqual({ key: "Wem", country: "England", point: [-2.7241, 52.8556], region: "England" });
    expect(placeOf("Cardiff, Wales")).toEqual({ key: "Wales", country: "Wales" });
    expect(cachedPoint("wem, shropshire,england")).toMatchObject({ name: "Wem" });
  });

  test("two towns of one name get their county", () => {
    const names = new Map();
    const a = placeOf("Newport, Shropshire", () => ({ name: "Newport", area: "Shropshire", point: [-2.37, 52.77] }), names);
    const b = placeOf("Newport, Monmouthshire, Wales", () => ({ name: "Newport", area: "Gwent", point: [-3, 51.58] }), names);
    expect([a.key, b.key]).toEqual(["Newport", "Newport (Gwent)"]);
  });

  test("buildMigration moves town to town, and can refine", () => {
    const slots = [null, { name: "Child", birthLocation: "Birkenhead, Cheshire, England", birth: "1880" }, { name: "Father", birthLocation: "Wem, Shropshire, England", birth: "1850" }];
    const migration = buildMigration(slots);
    expect(migration.flows.map((flow) => `${flow.from}→${flow.to}`)).toEqual(["Wem→Birkenhead"]);
    expect(migration.locations).toEqual(["Birkenhead, Cheshire, England", "Wem, Shropshire, England"]);
    expect(migration.refine(() => null).places.map((place) => place.key)).toEqual(["England"]);
  });

  test("skips known places and counts what's left", async () => {
    expect(pendingLookups(["Wem, Shropshire, England", "Ellesmere, Shropshire, England", "England"])).toBe(1);
    const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => [] }));
    global.fetch = fetchMock;
    const { done } = geocodeLocations(["Wem, Shropshire, England"]);
    expect(await done).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("queries: full, without the first part, then the place with its country", () => {
    expect(geocodeQueries("Birkenhead, Cheshire, England, United Kingdom").map((item) => `${item.query}${item.wide ? " (wide)" : ""}`)).toEqual([
      "birkenhead, cheshire, england, united kingdom",
      "cheshire, england, united kingdom",
      "birkenhead, united kingdom (wide)",
      "birkenhead, england (wide)",
    ]);
    expect(geocodeQueries("Wem, Shropshire").map((item) => item.query)).toEqual(["wem, shropshire"]);
  });

  test("a namesake is taken near the county, or not at all", () => {
    const shropshire = [-2.8, 52.65];
    const somerset = { name: "Wellington", settlement: true, point: [-3.23, 50.98] };
    const telford = { name: "Wellington", settlement: true, point: [-2.52, 52.7] };
    expect(Math.round(distanceKm(shropshire, telford.point))).toBe(20);
    expect(pickTown([somerset, telford], shropshire)).toBe(telford);
    expect(pickTown([somerset], shropshire)).toBeNull();
    expect(pickTown([{ name: "Shropshire", settlement: false, point: shropshire }, somerset], null)).toBe(somerset);
  });

  test("Photon: the town must be the place asked for, near the county it also returned", () => {
    expect(namesMatch("Shrewsbury", "Shrewsbury St Mary, Shrewsbury, Shropshire")).toBe(true);
    expect(namesMatch("England Shelve", "Wrockwardine, Shropshire, England")).toBe(false);
    expect(namesMatch("Llanycil", "Llanycil, Merionethshire, Wales")).toBe(true);
    // St/Sainte and a final "s" (Murray's map, 2026-10-05)
    expect(namesMatch("Sainte-Anne-des-Monts", "St Anne des Mont, Gaspésie, Québec, Canada")).toBe(true);
    expect(namesMatch("Saint-Siméon", "St Simeon, Charlevoix, Quebec")).toBe(true);
    expect(namesMatch("Mont-Bellevue", "St Anne des Mont, Gaspésie, Québec, Canada")).toBe(false);
    const hits = [
      { name: "Shropshire", settlement: false, point: [-2.8, 52.65] },
      { name: "Wellington", settlement: true, point: [-3.23, 50.98] },
      { name: "Wellington", settlement: true, point: [-2.52, 52.7] },
      { name: "England Shelve", settlement: true, point: [-2.92, 52.55] },
    ];
    expect(pickPhotonTown(hits, "Wellington, Shropshire, England").point).toEqual([-2.52, 52.7]);
    expect(pickPhotonTown(hits, "Shropshire, England")).toBeNull();
  });

  test("a county on its own goes to the county, not the middle of the country", () => {
    const hits = [{ name: "Denbighshire", settlement: false, point: [-3.37, 53.11] }];
    expect(pickPhotonTown(hits, "Denbighshire, Wales")).toBeNull();
    expect(pickPhotonCounty(hits, "Denbighshire, Wales").point).toEqual([-3.37, 53.11]);
    expect(pickPhotonCounty(hits, "Ruthin, Denbighshire, Wales")).toBeNull();
  });
});

test("Photon's Sainte-Anne-des-Monts is taken for St Anne des Mont", () => {
  // (Photon's answer, 2026-10-05)
  const hits = [
    { name: "Sainte-Anne-des-Monts", point: [-66.48, 49.13], settlement: true },
    { name: "Mont-Bellevue", point: [-66.52, 49.1], settlement: true },
  ];
  expect(pickPhotonTown(hits, "St Anne des Mont, Gaspésie, Québec, Canada")?.name).toBe("Sainte-Anne-des-Monts");
});

// User, 2026-10-14, on the migration map: "Not perfect though" (Roughton Head, Cumberland and Honitone Clyst, Devon on an "England" dot).
describe("a town that can't be found goes to its county", () => {
  test("only the county of that name: not York County for New York", () => {
    const hits = [
      { name: "York County", country: "Canada", point: [-66.9, 46.1] },
      { name: "Suffolk County", country: "United States", point: [-72.9, 40.9] },
    ];
    expect(parentCountyName("Smithtown, New York, USA")).toBe("new york");
    expect(pickParentCounty(hits, "Smithtown, New York, USA")).toBeNull();
    expect(pickParentCounty(hits, "Smithtown, Suffolk, New York, USA")).toEqual({ name: "Suffolk County", area: "county", country: "United States", point: [-72.9, 40.9] });
    expect(pickParentCounty([{ name: "County Durham", point: [-1.8, 54.7] }], "Esh, Durham, England")?.name).toBe("County Durham");
    // (a county on its own is looked up as itself)
    expect(parentCountyName("Cumberland, England")).toBe("");
  });

  test("shown at the county while Nominatim looks, and kept there when it finds nothing", async () => {
    jest.useFakeTimers();
    const location = "Roughton Head, Cumberland, England";
    const urls = [];
    global.fetch = jest.fn(async (url) => {
      urls.push(String(url));
      const countyLayer = /photon.*layer=county(?!&layer=state)/.test(url);
      const json = countyLayer
        ? { features: [{ properties: { name: "York County" }, geometry: { coordinates: [-66.9, 46.1] } }, { properties: { name: "Cumberland", country: "United Kingdom" }, geometry: { coordinates: [-3.3, 54.68] } }] }
        : /photon/.test(url)
          ? { features: [] }
          : [];
      return { ok: true, status: 200, json: async () => json };
    });
    try {
      const { fast, done } = geocodeLocations([location]);
      await fast;
      expect(cachedPoint(location)).toMatchObject({ name: "Cumberland", point: [-3.3, 54.68] });
      expect(pendingLookups([location])).toBe(1);
      expect(urls.filter((url) => /photon/.test(url)).map((url) => decodeURIComponent(url.split("q=")[1]))).toEqual(["cumberland, england", location.toLowerCase()]);
      await jest.advanceTimersByTimeAsync(10000);
      await done;
      expect(pendingLookups([location])).toBe(0);
      expect(cachedPoint(location)).toEqual({ name: "Cumberland", area: "county", country: "United Kingdom", point: [-3.3, 54.68] });
      expect(urls.filter((url) => /nominatim/.test(url))).toHaveLength(3);
    } finally {
      jest.useRealTimers();
    }
  });
});

// User, 2026-10-17, Tabitha (Parker) Dixon's descendants' map: "IS that Cumberland?" (a dot by Nottingham).
describe("Cumberland is Cumberland", () => {
  // (Photon's answers, 2026-10-17)
  test("a county alone is the county, not a namesake locality", () => {
    const counties = [{ name: "Cumberland", country: "United Kingdom", point: [-3.304, 54.6784] }];
    expect(pickWholeCounty(counties, "Cumberland, England")).toEqual({ name: "Cumberland", area: "county", country: "United Kingdom", point: [-3.304, 54.6784] });
    expect(pickWholeCounty(counties, "Wem, England")).toBeNull();
  });

  test("a town is the one near its county", () => {
    const hits = [
      { name: "Dacre", settlement: true, point: [-1.708, 54.0435] },
      { name: "Dacre", settlement: true, point: [-2.8394, 54.6311] },
    ];
    expect(pickPhotonTown(hits, "Dacre, Cumberland, England", [-3.304, 54.6784]).point).toEqual([-2.8394, 54.6311]);
  });
});
