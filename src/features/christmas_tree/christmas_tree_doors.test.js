import {
  canSwap,
  checkDoors,
  jobFor,
  openDoor,
  openDoorCount,
  pickForDoor,
  seasonOf,
  starLit,
  swapDoor,
} from "./christmas_tree_doors";

// Months are 0-based: 10 is November, 11 December
const DEC_3 = new Date(2026, 11, 3);
const slim = (Id, groups, extra = {}) => ({
  Id,
  Name: `P-${Id}`,
  LongName: `Person ${Id}`,
  groups,
  Degrees: 2,
  ...extra,
});

describe("dates", () => {
  test("the season is December's year", () => {
    expect(seasonOf(new Date(2026, 11, 1))).toBe(2026);
    expect(seasonOf(new Date(2027, 0, 6))).toBe(2026);
    expect(seasonOf(new Date(2026, 10, 30))).toBe(2026); // the coming season: a November scan lasts into December
    expect(seasonOf(new Date(2026, 9, 31))).toBe(2025);
  });

  test("a door a day in December; all of them after; none in November", () => {
    expect(openDoorCount(new Date(2026, 10, 30, 23, 59))).toBe(0);
    expect(openDoorCount(new Date(2026, 11, 1))).toBe(1);
    expect(openDoorCount(new Date(2026, 11, 24))).toBe(24);
    expect(openDoorCount(new Date(2026, 11, 25))).toBe(25);
    expect(openDoorCount(new Date(2026, 11, 31))).toBe(25);
    expect(openDoorCount(new Date(2027, 0, 6))).toBe(25);
  });
});

test("jobFor: the quickest job", () => {
  expect(jobFor(["headless", "skeleton"])).toBe("skeleton");
  expect(jobFor(["undead", "ghost"])).toBe("ghost");
  expect(jobFor(["christmas"])).toBe(null);
  expect(jobFor([])).toBe(null);
});

describe("pickForDoor", () => {
  test("the jobs take turns; within a job, closest first, then managed", () => {
    const people = [
      slim(1, ["headless"], { Degrees: 3 }),
      slim(2, ["headless"], { Degrees: 1, LongName: "Zed" }),
      slim(3, ["skeleton"], { Degrees: 1, LongName: "Amy" }),
      slim(4, ["headless"], { Degrees: 1, managed: true }),
      slim(5, ["undead", "headless"], { Degrees: 2 }),
    ];
    const doors = [];
    const next = () => {
      const pick = pickForDoor(people, doors);
      doors.push({ Id: pick.person.Id, job: pick.job });
      return [pick.person.Id, pick.job];
    };
    expect(next()).toEqual([5, "undead"]); // nothing given yet: the quickest job first
    expect(next()).toEqual([3, "skeleton"]);
    expect(next()).toEqual([4, "headless"]); // closest, then managed
    expect(next()).toEqual([2, "headless"]); // only headless is left
    expect(next()).toEqual([1, "headless"]);
    expect(pickForDoor(people, doors)).toBe(null);
  });

  test("lots of one kind of job still gives the others a turn", () => {
    const people = [
      ...[1, 2, 3, 4, 5, 6].map((id) => slim(id, ["undead"], { Degrees: 1 })),
      slim(7, ["headless"], { Degrees: 5 }),
      slim(8, ["skeleton"], { Degrees: 6 }),
    ];
    const jobs = [];
    const doors = [];
    for (let i = 0; i < 4; i++) {
      const pick = pickForDoor(people, doors);
      doors.push({ Id: pick.person.Id, job: pick.job });
      jobs.push(pick.job);
    }
    expect(jobs).toEqual(["undead", "skeleton", "headless", "undead"]);
  });

  test("ties are shuffled, not alphabetical, and come out the same every time", () => {
    const people = ["Aaron", "Abel", "Abraham", "Ada", "Zoe", "Yusuf", "Xavier", "Will"].map((name, i) =>
      slim(100 + i, ["undead"], { Degrees: null, managed: true, LongName: name })
    );
    const order = (list) => {
      const doors = [];
      for (let i = 0; i < list.length; i++) doors.push({ Id: pickForDoor(list, doors).person.Id, job: "undead" });
      return doors.map((d) => d.Id);
    };
    const first = order(people);
    expect(first).not.toEqual(people.map((p) => p.Id));
    expect(order([...people].reverse())).toEqual(first);
  });

  test("the watchlist has no degrees, so managed first", () => {
    const people = [slim(1, ["ghost"], { Degrees: null }), slim(2, ["ghost"], { Degrees: null, managed: true })];
    expect(pickForDoor(people, []).person.Id).toBe(2);
  });

  test("nobody twice, including anyone swapped out", () => {
    const people = [slim(1, ["ghost"]), slim(2, ["ghost"])];
    expect(pickForDoor(people, [{ Id: 2, swappedFrom: 1 }])).toBe(null);
  });

  test("Christmas folk when nobody is left who needs help", () => {
    const people = [slim(1, ["ghost"]), slim(2, ["christmas"])];
    expect(pickForDoor(people, [{ Id: 1 }])).toEqual({ person: people[1], job: "folk" });
  });
});

describe("openDoor", () => {
  const people = [slim(1, ["ghost"]), slim(2, ["skeleton"]), slim(3, ["christmas"])];

  test("only doors up to today", () => {
    expect(openDoor([], 4, people, DEC_3)).toEqual({ doors: [], door: null });
    expect(openDoor([], 0, people, DEC_3).door).toBe(null);
    expect(openDoor([], 1, people, new Date(2026, 10, 30)).door).toBe(null);
  });

  test("a new door is kept; opening it again gives the same person", () => {
    const first = openDoor([], 2, people, DEC_3);
    expect(first.door).toMatchObject({ door: 2, Id: 1, job: "ghost", done: false, swapped: false });
    expect(openDoor(first.doors, 2, people, DEC_3)).toEqual({ doors: first.doors, door: first.door });
    const second = openDoor(first.doors, 1, people, DEC_3);
    expect(second.door).toMatchObject({ door: 1, Id: 2, job: "skeleton" });
    expect(second.doors.map((d) => d.door)).toEqual([1, 2]);
  });

  test("Christmas folk doors are done once opened; with nobody left, the door is empty and done", () => {
    let doors = openDoor([], 1, people, DEC_3).doors;
    doors = openDoor(doors, 2, people, DEC_3).doors;
    const folk = openDoor(doors, 3, people, DEC_3);
    expect(folk.door).toMatchObject({ Id: 3, job: "folk", done: true });
    const empty = openDoor(folk.doors, 4, people, new Date(2026, 11, 4));
    expect(empty.door).toMatchObject({ door: 4, Id: null, job: "empty", done: true });
    expect(canSwap(empty.door)).toBe(false);
  });

  test("door 25 is a present: a Christmas folk relative first, if there is one", () => {
    const xmas = new Date(2026, 11, 25);
    expect(openDoor([], 25, people, new Date(2026, 11, 24)).door).toBe(null);
    const present = openDoor([], 25, people, xmas);
    expect(present.door).toMatchObject({ door: 25, Id: 3, job: "folk", done: true });
    // With no Christmas folk, door 25 holds a job like any other
    const plain = openDoor([], 25, people.slice(0, 2), xmas);
    expect(plain.door).toMatchObject({ door: 25, Id: 1, job: "ghost", done: false });
    // Other doors still give jobs before Christmas folk
    expect(openDoor([], 3, people, DEC_3).door).toMatchObject({ Id: 1, job: "ghost" });
  });
});

describe("swapDoor", () => {
  const people = [slim(1, ["ghost"]), slim(2, ["ghost"]), slim(3, ["ghost"]), slim(4, ["christmas"])];

  test("once per door, and the swapped-out person isn't given again", () => {
    const { doors, door } = openDoor([], 1, people, DEC_3);
    const swapped = swapDoor(doors, 1, people);
    expect(swapped.door).toMatchObject({ door: 1, swapped: true, swappedFrom: door.Id });
    expect([1, 2, 3]).toContain(swapped.door.Id);
    expect(swapped.door.Id).not.toBe(door.Id);
    expect(canSwap(swapped.door)).toBe(false);
    expect(swapDoor(swapped.doors, 1, people).door.Id).toBe(swapped.door.Id);
    // Door 2 gets the third ghost: neither the swapped-out person nor the one now behind door 1
    const third = [1, 2, 3].find((id) => id !== door.Id && id !== swapped.door.Id);
    expect(openDoor(swapped.doors, 2, people, DEC_3).door.Id).toBe(third);
  });

  test("not for done doors, and not for Christmas folk", () => {
    const { doors } = openDoor([], 1, people, DEC_3);
    const done = doors.map((d) => ({ ...d, done: true }));
    expect(swapDoor(done, 1, people).doors).toBe(done);
    const onlyFolkLeft = [slim(1, ["ghost"]), slim(4, ["christmas"])];
    const opened = openDoor([], 1, onlyFolkLeft, DEC_3).doors;
    expect(swapDoor(opened, 1, onlyFolkLeft).door.Id).toBe(1);
  });
});

describe("checkDoors and the star", () => {
  test("done once the job's group is gone, or the person no longer needs keeping", () => {
    const doors = [
      { door: 1, Id: 1, job: "ghost", done: false },
      { door: 2, Id: 2, job: "skeleton", done: false },
      { door: 3, Id: 3, job: "headless", done: false },
    ];
    const now = [slim(1, ["undead"]), slim(2, ["skeleton"])]; // 1 got a date, 3 was put right
    expect(checkDoors(doors, now).map((d) => d.done)).toEqual([true, false, true]);
  });

  test("the star lights when every door so far is open and done", () => {
    const done = (n) => ({ door: n, done: true });
    expect(starLit([done(1), done(2), done(3)], DEC_3)).toBe(true);
    expect(starLit([done(1), done(3)], DEC_3)).toBe(false);
    expect(starLit([done(1), done(2), { door: 3, done: false }], DEC_3)).toBe(false);
    expect(starLit([], new Date(2026, 10, 30))).toBe(false);
  });
});

describe("checkDoors keeps names and years up to date", () => {
  const door = {
    door: 10,
    Id: 5,
    Name: "Smith-1",
    LongName: "William Smith",
    years: "1807–?",
    job: "skeleton",
    done: false,
  };
  it("takes them from the kept people", () => {
    const people = [{ Id: 5, Name: "Smith-1", LongName: "William Smith", years: "1811–?", groups: ["skeleton"] }];
    expect(checkDoors([door], people)[0]).toMatchObject({ years: "1811–?", done: false });
  });
  it("takes them from the fresh profile when the person is no longer kept", () => {
    const fresh = [
      { Id: 5, Name: "Smith-1", LongName: "William Smith", BirthDate: "1811-00-00", DeathDate: "1880-05-01" },
    ];
    expect(checkDoors([door], [], fresh)[0]).toMatchObject({ years: "1811–1880", done: true });
  });
});
