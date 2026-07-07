import { isLocationTopicCategoryPrompt, matchLocationTopicCategory } from "./chat_place_topic_category";

describe("matchLocationTopicCategory", () => {
  test("recognises the plain place+topic form", () => {
    expect(matchLocationTopicCategory("Chicago military")).toEqual({
      location: "Chicago",
      label: "military",
      synonyms: ["military", "army", "navy", "naval", "war", "regiment", "infantry", "cavalry", "artillery", "veteran"],
    });
  });

  test("strips a trailing 'categories' / 'profiles' noun", () => {
    expect(matchLocationTopicCategory("Chicago military categories")?.location).toBe("Chicago");
    expect(matchLocationTopicCategory("Chicago military profiles")?.location).toBe("Chicago");
  });

  test("handles the topic-first 'in' form", () => {
    const m = matchLocationTopicCategory("military in Chicago");
    expect(m?.location).toBe("Chicago");
    expect(m?.label).toBe("military");
  });

  test("keeps a multi-word / comma location whole", () => {
    expect(matchLocationTopicCategory("Chicago, Illinois military")?.location).toBe("Chicago, Illinois");
    expect(matchLocationTopicCategory("military in Cook County")?.location).toBe("Cook County");
  });

  test("drops a war qualifier from the place", () => {
    expect(matchLocationTopicCategory("Chicago civil war")?.location).toBe("Chicago");
  });

  test("strips leading command words", () => {
    expect(matchLocationTopicCategory("show me Yorkshire mining")?.location).toBe("Yorkshire");
    expect(matchLocationTopicCategory("find Devon miners")?.location).toBe("Devon");
  });

  test("supports other topic groups", () => {
    expect(matchLocationTopicCategory("Yorkshire mining")?.label).toBe("mining");
    expect(matchLocationTopicCategory("Crewe railway")?.label).toBe("railway");
    expect(matchLocationTopicCategory("Liverpool maritime")?.label).toBe("maritime");
    expect(matchLocationTopicCategory("Boston medical")?.label).toBe("medical");
  });

  test("supports the newly added topic groups", () => {
    expect(matchLocationTopicCategory("Oxford education")?.label).toBe("education");
    expect(matchLocationTopicCategory("London lawyers")?.label).toBe("legal");
    expect(matchLocationTopicCategory("Rome clergy")?.label).toBe("religious");
    expect(matchLocationTopicCategory("Chicago politicians")?.label).toBe("politics");
    expect(matchLocationTopicCategory("Paris artists")?.label).toBe("arts");
    expect(matchLocationTopicCategory("Manchester football")?.label).toBe("sports");
    expect(matchLocationTopicCategory("Seattle aviation")?.label).toBe("aviation");
    expect(matchLocationTopicCategory("Boston police")?.label).toBe("police");
    expect(matchLocationTopicCategory("Kent farming")?.label).toBe("agriculture");
    expect(matchLocationTopicCategory("England nobility")?.label).toBe("nobility");
    expect(matchLocationTopicCategory("Ohio pioneers")?.label).toBe("migration");
    expect(matchLocationTopicCategory("Virginia slavery")?.label).toBe("slavery");
  });

  test("keeps surname-like words out of triggers", () => {
    // These words are expansion synonyms only, so a "<Given> <Surname>" prompt
    // where the surname happens to be one of them is not treated as a topic.
    expect(matchLocationTopicCategory("John Painter")).toBeNull();
    expect(matchLocationTopicCategory("Andrew Law")).toBeNull();
    expect(matchLocationTopicCategory("Rebecca Nurse")).toBeNull();
    expect(matchLocationTopicCategory("John Constable")).toBeNull();
    expect(matchLocationTopicCategory("Sarah Church")).toBeNull();
    expect(matchLocationTopicCategory("Tom Farmer")).toBeNull();
    expect(matchLocationTopicCategory("Art Smith")).toBeNull();
  });

  test("does not hijack a plain two-token name", () => {
    expect(matchLocationTopicCategory("John Smith")).toBeNull();
    expect(matchLocationTopicCategory("George Beacall")).toBeNull();
  });

  test("declines when there is no real place", () => {
    expect(matchLocationTopicCategory("military")).toBeNull();
    expect(matchLocationTopicCategory("army navy")).toBeNull();
  });

  test("declines when a date/number is present", () => {
    expect(matchLocationTopicCategory("Chicago military 1863")).toBeNull();
  });

  test("declines an over-long natural-language fragment", () => {
    expect(matchLocationTopicCategory("people who served in the military somewhere near Chicago")).toBeNull();
  });

  test("boolean helper mirrors the matcher", () => {
    expect(isLocationTopicCategoryPrompt("Chicago military")).toBe(true);
    expect(isLocationTopicCategoryPrompt("John Smith")).toBe(false);
  });
});
