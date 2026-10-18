import { bigPullKey, createFetchMemo } from "./chat_fetch_memo";

describe("big pulls kept for a few minutes", () => {
  test("a copy back, until it's stale", () => {
    let time = 0;
    const memo = createFetchMemo({ keepMs: 1000, now: () => time });
    const people = { 1: { Id: 1, Name: "Roosevelt-1" } };
    memo.set("k", ["OK", 1, people]);
    const got = memo.get("k");
    expect(got).toEqual(["OK", 1, people]);
    got[2][1].Name = "changed";
    expect(memo.get("k")[2][1].Name).toBe("Roosevelt-1");
    time = 1001;
    expect(memo.get("k")).toBeNull();
  });
  test("only the last few", () => {
    const memo = createFetchMemo({ maxKept: 2 });
    memo.set("a", 1);
    memo.set("b", 2);
    memo.set("c", 3);
    expect([memo.get("a"), memo.get("b"), memo.get("c")]).toEqual([null, 2, 3]);
  });
  test("which pulls", () => {
    expect(bigPullKey("app", "Roosevelt-1", "Id", { ancestors: 25, limit: 1000, onProgress: () => {} })).toBe(JSON.stringify(["app", "Roosevelt-1", "Id", { ancestors: 25, limit: 1000 }]));
    expect(bigPullKey("app", "Roosevelt-1", "Id", { ancestors: 3 })).toBe("");
    expect(bigPullKey("app", "Roosevelt-1", "Id", { descendants: 10 })).toBe("");
    expect(bigPullKey("app", "1,2", "Id", { ancestors: 25 })).toBe("");
    // (the ancestor questions pass the numeric Id: the memo never kept anything, the dry run after, 2026-10-18)
    expect(bigPullKey("app", 7368, "Id", { ancestors: 25 })).toBe(bigPullKey("app", "7368", "Id", { ancestors: 25 }));
    expect(bigPullKey("app", 7368, "Id", { ancestors: 25 })).not.toBe("");
  });
});
