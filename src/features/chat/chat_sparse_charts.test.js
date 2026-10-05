jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn() }));
jest.mock("../../core/API/WikiTreeAPI", () => ({ WikiTreeAPI: {} }));
jest.mock("./chat_ages_chart", () => ({ showAgesPopup: jest.fn() }));
jest.mock("./chat_fan_chart", () => ({ showFanChartPopup: jest.fn() }));
jest.mock("./chat_name_cloud", () => ({ showNameCloudPopup: jest.fn() }));
jest.mock("./chat_family_calendar", () => ({ showFamilyCalendarPopup: jest.fn() }));
jest.mock("./chat_lifespans_chart", () => ({ showLifespansPopup: jest.fn() }));

import { WikiTreeAPI } from "../../core/API/WikiTreeAPI";
import { createChatPeopleHandlers } from "./chat_people";
import { showAgesPopup } from "./chat_ages_chart";
import { showFanChartPopup } from "./chat_fan_chart";
import { showNameCloudPopup } from "./chat_name_cloud";
import { showFamilyCalendarPopup } from "./chat_family_calendar";
import { showLifespansPopup } from "./chat_lifespans_chart";

beforeEach(() => jest.clearAllMocks());

async function links({ dated = true } = {}) {
  const notify = jest.fn();
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "Root-1",
    notify,
    fetchPeoplePaged: async () => [
      null,
      null,
      {
        1: { Id: 1, Name: "Root-1", Father: 2 },
        2: {
          Id: 2,
          Name: "Father-1",
          RealName: "William",
          FirstName: "William",
          BirthDate: dated ? "1850-01-02" : "0000-00-00",
        },
      },
    ],
  });
  await handlers.tryHandleFanChartPrompt({ ancestorPrompt: "this profile's ancestors", generations: 3 });
  return { links: showFanChartPopup.mock.calls[0][1].links, notify };
}

test.each([
  ["Names", showNameCloudPopup],
  ["Calendar", showFamilyCalendarPopup],
  ["Lifespans", showLifespansPopup],
])("%s opens with a single usable ancestor", async (label, show) => {
  const fixture = await links();
  await fixture.links.find((link) => link.label === label).open("Root-1");
  expect(show).toHaveBeenCalledTimes(1);
  expect(fixture.notify).not.toHaveBeenCalled();
});

test("a calendar link explains when no dates can be charted", async () => {
  const fixture = await links({ dated: false });
  await fixture.links.find((link) => link.label === "Calendar").open("Root-1");
  expect(showFamilyCalendarPopup).not.toHaveBeenCalled();
  expect(fixture.notify).toHaveBeenCalledWith("Family calendar has no usable data to chart for this profile.");
});

test("an empty calendar response keeps the explanation without a fallback table", async () => {
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Harris-46781", wtId: "Harris-46781", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Harris-46781)",
    fetchPeoplePaged: async () => [null, null, {
      1: { Id: 1, Name: "Harris-46781", FirstName: "William", BirthDate: "1845-00-00" },
    }],
  });
  const result = await handlers.tryHandleFamilyCalendarPrompt({ ancestorPrompt: "this profile's ancestors" });
  expect(result.message).toContain("William (Harris-46781) has no parents attached on WikiTree");
  expect(result.message).toContain("the calendar is empty");
  expect(result.message).not.toContain("ancestors don't have");
  expect(result.chartOpened).toBe(false);
  expect(result).not.toHaveProperty("table");
  expect(showFamilyCalendarPopup).not.toHaveBeenCalled();
});

test.each(["death", "parent", "problems"])("Ages explains unattached parents without a chart or table (%s)", async (mode) => {
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Harris-46781", wtId: "Harris-46781", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Harris-46781)",
    fetchPeoplePaged: async () => [null, null, {
      1: { Id: 1, Name: "Harris-46781", FirstName: "William", BirthDate: "1845-00-00", Father: 0, Mother: 0 },
    }],
  });
  const result = await handlers.tryHandleAgesPrompt({ mode, ancestorPrompt: "this profile's ancestors" });
  expect(result.message).toContain("has no parents attached on WikiTree");
  expect(result.message).toContain("enough birth or death dates");
  expect(result.chartOpened).toBe(false);
  expect(result).not.toHaveProperty("table");
  expect(result.actions.map((action) => action.label)).not.toContain("Open Lives & ages");
  expect(showAgesPopup).not.toHaveBeenCalled();
});

test("Names uses children when no parents are attached, without a fallback table", async () => {
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Root-1)",
    fetchPeoplePaged: async (app, key, fields, options) => [null, null, {
      1: { Id: 1, Name: "Root-1", FirstName: "William", Father: 0, Mother: 0 },
      ...(options.descendants ? { 2: { Id: 2, Name: "Child-1", FirstName: "James", LastNameAtBirth: "Harris", Father: 1 } } : {}),
    }],
  });
  const result = await handlers.tryHandleNameCloudPrompt({ ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(result).not.toHaveProperty("table");
  expect(result.message).toContain("used descendants");
  expect(showNameCloudPopup.mock.calls[0][0].first[0].text).toBe("James");
  expect(showNameCloudPopup.mock.calls[0][1].scope).toBe("descendants");
  expect(showNameCloudPopup.mock.calls[0][1].onRiver).toBeUndefined();
});

test("Ages charts dated descendants when no parents are attached", async () => {
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Root-1)",
    fetchPeoplePaged: async (app, key, fields, options) => [null, null, {
      1: { Id: 1, Name: "Root-1", Gender: "Male", BirthDate: "1845-00-00", Father: 0, Mother: 0 },
      ...(options.descendants ? { 2: { Id: 2, Name: "Child-1", FirstName: "James", Gender: "Male", BirthDate: "1870-01-02", DeathDate: "1950-01-02", Father: 1 } } : {}),
    }],
  });
  const result = await handlers.tryHandleAgesPrompt({ ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(result.message).toContain("used descendants");
  expect(result.message).toContain("80");
  expect(result).not.toHaveProperty("table");
  expect(showAgesPopup.mock.calls[0][0][2]).toMatchObject({ wtid: "Child-1", generation: 1 });
});

test("Lifespans uses descendants when no parents are attached and omits the ancestor table", async () => {
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Root-1)",
    fetchPeoplePaged: async (app, key, fields, options) => [null, null, {
      1: { Id: 1, Name: "Root-1", BirthDate: "1845-00-00", Father: 0, Mother: 0 },
      ...(options.descendants ? { 2: { Id: 2, Name: "Child-1", FirstName: "James", BirthDate: "1870-01-02", DeathDate: "1950-01-02", Father: 1 } } : {}),
    }],
  });
  const result = await handlers.tryHandleLifespansPrompt({ ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(result.message).toContain("no parents attached");
  expect(result.message).toContain("descendants' lifespans");
  expect(result).not.toHaveProperty("table");
  expect(showLifespansPopup.mock.calls[0][1].view).toBe("descendants");
});

test("History charts the profile alone using a year-only birth date", async () => {
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "William (Root-1)",
    fetchPeoplePaged: async () => [null, null, {
      1: { Id: 1, Name: "Root-1", FirstName: "William", BirthDate: "1845-00-00", Father: 0, Mother: 0 },
    }],
  });
  const result = await handlers.tryHandleLifespansPrompt({ history: true, ancestorPrompt: "this profile's ancestors" });
  expect(result.chartOpened).toBe(true);
  expect(result).not.toHaveProperty("table");
  expect(result.message).not.toContain("ancestors don't have");
  expect(showLifespansPopup.mock.calls[0][0]).toHaveLength(1);
  expect(showLifespansPopup.mock.calls[0][0][0]).toMatchObject({ wtid: "Root-1", start: 1845 });
});

test("Calendar includes ancestors, descendants, siblings and spouses once each", async () => {
  const root = { Id: 1, Name: "Root-1", BirthDate: "1845-01-02", Father: 2 };
  const father = { Id: 2, Name: "Father-1", BirthDate: "1820-01-02" };
  const child = { Id: 3, Name: "Child-1", Father: 1, BirthDate: "1870-01-02", Gender: "Female" };
  WikiTreeAPI.getRelatives = jest.fn(async () => [{ person: { Siblings: { 4: { Id: 4, Name: "Sibling-1", BirthDate: "1847-01-02" } }, Spouses: { 5: { Id: 5, Name: "Spouse-1", BirthDate: "1846-01-02" } } } }]);
  try {
    const handlers = createChatPeopleHandlers({
      WBE_CHAT_APP_ID: "test",
      getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
      formatSubjectLabel: () => "William (Root-1)",
      fetchPeoplePaged: async (app, key, fields, options) => [null, null, options.descendants ? { 1: root, 3: child } : { 1: root, 2: father }],
    });
    const result = await handlers.tryHandleFamilyCalendarPrompt({ ancestorPrompt: "this profile's ancestors" });
    expect(result.chartOpened).toBe(true);
    expect(result).not.toHaveProperty("table");
    const events = showFamilyCalendarPopup.mock.calls[0][0];
    expect(events.map((event) => event.wtid).sort()).toEqual(["Child-1", "Father-1", "Root-1", "Sibling-1", "Spouse-1"]);
    expect(events.find((event) => event.wtid === "Child-1").relation).toBe("Daughter");
    expect(events.find((event) => event.wtid === "Spouse-1").relation).toBe("Spouse");
  } finally { delete WikiTreeAPI.getRelatives; }
});

test("living descendant requests exclude deceased and unknown-status profiles", async () => {
  const fetchPeoplePaged = jest.fn(async () => [null, null, {
    2: { Id: 2, Name: "Deceased-1", IsLiving: 0, DeathDate: "1900-01-01", Meta: { Degrees: 1 } },
    3: { Id: 3, Name: "Unknown-1", Meta: { Degrees: 1 } },
  }]);
  const handlers = createChatPeopleHandlers({
    WBE_CHAT_APP_ID: "test",
    normalizeText: (value) => String(value).toLowerCase(),
    promptRefersToUser: () => false,
    mapApiPersonToStandardRow: (person) => ({ wtId: person.Name, id: person.Id }),
    getProfileSubjectRoot: () => ({ key: "Root-1", wtId: "Root-1", subjectType: "profile" }),
    formatSubjectLabel: () => "Philip (Root-1)",
    fetchPeoplePaged,
  });
  const result = await handlers.tryHandleDescendantListPrompt({ generation: 10, includeUpTo: true, livingOnly: true }, "Who are his living descendants?");
  expect(result).toContain("No descendants");
  expect(result).toContain("marked living");
  expect(fetchPeoplePaged.mock.calls[0][2]).toContain("IsLiving");
});
