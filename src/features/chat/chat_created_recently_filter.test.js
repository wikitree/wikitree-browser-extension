import {
  buildCreatedRecentlyMatches,
  formatCreatedRecentlyWindow,
  isLikelyCreatedRecentlyPrompt,
  parseCreatedRecentlyPrompt,
} from "./chat_created_recently_filter";

describe("chat_created_recently_filter prompt parsing", () => {
  test("parses leading-location last-N-days prompt without requiring profiles", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 12, 0, 0));
    const result = parseCreatedRecentlyPrompt("Devon added in the last 30 days", now);

    expect(result).toEqual({
      locationText: "Devon",
      days: 30,
      windowAmount: 30,
      windowUnit: "day",
      startDateNumber: 20260317,
      endDateNumber: 20260415,
      startDateLabel: "2026-03-17",
      endDateLabel: "2026-04-15",
      yearNumbers: [2026],
      windowLabel: "in the last 30 days",
      understood: "Devon added in the last 30 days",
    });
  });

  test("includes previous year when date window crosses January", () => {
    const now = new Date(Date.UTC(2026, 0, 10, 12, 0, 0));
    const result = parseCreatedRecentlyPrompt("Devon created in the last 30 days", now);

    expect(result).toEqual({
      locationText: "Devon",
      days: 30,
      windowAmount: 30,
      windowUnit: "day",
      startDateNumber: 20251212,
      endDateNumber: 20260110,
      startDateLabel: "2025-12-12",
      endDateLabel: "2026-01-10",
      yearNumbers: [2025, 2026],
      windowLabel: "in the last 30 days",
      understood: "Devon added in the last 30 days",
    });
  });

  test("parses this-week and last-week windows", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 12, 0, 0));

    expect(parseCreatedRecentlyPrompt("Devon created this week", now)).toEqual({
      locationText: "Devon",
      days: null,
      windowAmount: 1,
      windowUnit: "week",
      startDateNumber: 20260413,
      endDateNumber: 20260415,
      startDateLabel: "2026-04-13",
      endDateLabel: "2026-04-15",
      yearNumbers: [2026],
      windowLabel: "this week",
      understood: "Devon added this week",
    });

    expect(parseCreatedRecentlyPrompt("Devon added last week", now)).toEqual({
      locationText: "Devon",
      days: null,
      windowAmount: 1,
      windowUnit: "week",
      startDateNumber: 20260406,
      endDateNumber: 20260412,
      startDateLabel: "2026-04-06",
      endDateLabel: "2026-04-12",
      yearNumbers: [2026],
      windowLabel: "last week",
      understood: "Devon added last week",
    });
  });

  test("parses last-N-month windows and includes all covered years", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 12, 0, 0));
    const result = parseCreatedRecentlyPrompt("Devon profiles added in the last 6 months", now);

    expect(result).toEqual({
      locationText: "Devon",
      days: null,
      windowAmount: 6,
      windowUnit: "month",
      startDateNumber: 20251016,
      endDateNumber: 20260415,
      startDateLabel: "2025-10-16",
      endDateLabel: "2026-04-15",
      yearNumbers: [2025, 2026],
      windowLabel: "in the last 6 months",
      understood: "Devon added in the last 6 months",
    });
  });

  test("parses spelled-out month counts", () => {
    const now = new Date(Date.UTC(2026, 3, 15, 12, 0, 0));
    const result = parseCreatedRecentlyPrompt("Devon profiles created in the last six months", now);

    expect(result).toEqual({
      locationText: "Devon",
      days: null,
      windowAmount: 6,
      windowUnit: "month",
      startDateNumber: 20251016,
      endDateNumber: 20260415,
      startDateLabel: "2025-10-16",
      endDateLabel: "2026-04-15",
      yearNumbers: [2025, 2026],
      windowLabel: "in the last 6 months",
      understood: "Devon added in the last 6 months",
    });
  });

  test("detects supported prompts and rejects plain location phrases", () => {
    expect(isLikelyCreatedRecentlyPrompt("Devon added in the last 30 days")).toBe(true);
    expect(isLikelyCreatedRecentlyPrompt("profiles created in Devon in the last 7 days")).toBe(true);
    expect(isLikelyCreatedRecentlyPrompt("Devon created this week")).toBe(true);
    expect(isLikelyCreatedRecentlyPrompt("Devon added last week")).toBe(true);
    expect(isLikelyCreatedRecentlyPrompt("Devon added in the last 6 months")).toBe(true);
    expect(isLikelyCreatedRecentlyPrompt("Devon profiles created in the last six months")).toBe(true);
    expect(isLikelyCreatedRecentlyPrompt("Devon profiles")).toBe(false);
  });

  test("formats window label", () => {
    expect(formatCreatedRecentlyWindow(1)).toBe("in the last 1 day");
    expect(formatCreatedRecentlyWindow(30)).toBe("in the last 30 days");
    expect(formatCreatedRecentlyWindow(6, "month")).toBe("in the last 6 months");
  });
});

describe("chat_created_recently_filter match building", () => {
  test("filters people by Created date window", () => {
    const matches = buildCreatedRecentlyMatches(
      [
        { Id: 1, Name: "Recent-1", Created: "20260415112233" },
        { Id: 2, Name: "Recent-2", Created: "20260317000000" },
        { Id: 3, Name: "Old-1", Created: "20260316" },
        { Id: 4, Name: "Missing-1", Created: "" },
      ],
      { startDateNumber: 20260317, endDateNumber: 20260415 }
    );

    expect(matches).toEqual([
      {
        profileId: "1",
        profileWtId: "Recent-1",
        createdDateNumber: 20260415,
        createdDate: "2026-04-15",
      },
      {
        profileId: "2",
        profileWtId: "Recent-2",
        createdDateNumber: 20260317,
        createdDate: "2026-03-17",
      },
    ]);
  });

  test("formats timestamp-style Created values from getPeople", () => {
    const matches = buildCreatedRecentlyMatches([{ Id: 1, Name: "Recent-1", Created: "20251015143752" }], {
      startDateNumber: 20251015,
      endDateNumber: 20260414,
    });

    expect(matches).toEqual([
      {
        profileId: "1",
        profileWtId: "Recent-1",
        createdDateNumber: 20251015,
        createdDate: "2025-10-15",
      },
    ]);
  });
});
