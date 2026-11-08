import { NotLoggedInError, buildPrivateFacts, storedFactsFit } from "./presentation_mode_store";

const answer = (body) => Promise.resolve({ ok: true, text: () => Promise.resolve(JSON.stringify(body)) });

afterEach(() => {
  delete global.fetch;
});

describe("buildPrivateFacts", () => {
  test("an empty watchlist (the API's answer without the login) means not logged in", async () => {
    global.fetch = jest.fn(() => answer([{ watchlist: [], status: 0, watchlistCount: false }]));
    await expect(buildPrivateFacts({ userId: 101 })).rejects.toBeInstanceOf(NotLoggedInError);
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});

describe("storedFactsFit", () => {
  const record = { userId: 101, watchlistCount: 250, facts: [] };
  test("the member's own list", () => {
    expect(storedFactsFit(record, 101)).toBe(true);
    expect(storedFactsFit(record, 202)).toBe(false);
  });
  test("not a list built without the login", () => {
    expect(storedFactsFit({ ...record, watchlistCount: 0 }, 101)).toBe(false);
  });
});
