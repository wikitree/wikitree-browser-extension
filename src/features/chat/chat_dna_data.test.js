jest.mock("../../core/common", () => ({ getProfilePersonInfo: jest.fn(() => ({ Name: "Cook-8721" })) }));
import { autosomalShare, furthestLineAncestors, lineSharersGenerations, lineSharersHeading, hiddenCarrierChildren, parseDnaCarrierPrompt, buildDnaCarrierSummary, dnaCarriers, buildDnaLinesSummary, dnaLineAncestors, dnaLineCarrierNote, dnaLineOf, lineTestSummary, buildParentStatusSummary, buildXDnaSummary, parentLinkStatus, parentStatusCounts, parseDnaChartPrompt, percentText, xDnaRows, xDnaShares } from "./chat_dna_data";
import { routeChatPrompt, ChatIntent } from "./chat_router";
import { isWtPlusOnlyPrompt } from "./chat_search_mode";

function fullSlots(rootGender, generations) {
  const slots = new Array(2 ** (generations + 1)).fill(null);
  for (let slot = 1; slot < slots.length; slot += 1) {
    slots[slot] = { id: slot, wtid: `P-${slot}`, name: `P${slot}`, gender: slot === 1 ? rootGender : slot % 2 === 0 ? "Male" : "Female" };
  }
  return slots;
}

describe("parseDnaChartPrompt", () => {
  test.each([
    ["X-DNA chart", ""],
    ["show my X-DNA fan chart", "my"],
    ["x dna", ""],
    ["Cook-8721's X chromosome inheritance chart", "Cook-8721"],
    ["Who could I have inherited X-DNA from?", "my"],
    ["who did she get her X chromosome from", "her"],
    ["which of my ancestors could have passed down X-DNA", "my"],
    ["who passed X-DNA to me", ""],
  ])("%s", (prompt, owner) => {
    const params = parseDnaChartPrompt(prompt);
    expect(params).toMatchObject({ mode: "xdna", dna: true });
    if (owner) expect(params.owner).toBe(owner);
  });

  test.each(["show my DNA matches", "X marks the spot", "who is Xavier"])("%s isn't an X-DNA chart", (prompt) => {
    expect(parseDnaChartPrompt(prompt)).toBeNull();
  });

  test("routes to the fan chart, not a WT+ search", () => {
    expect(routeChatPrompt("show my X-DNA chart").intent).toBe(ChatIntent.FAN_CHART);
    expect(routeChatPrompt("show my X-DNA chart").params.mode).toBe("xdna");
    expect(isWtPlusOnlyPrompt("show my X-DNA chart")).toBe(false);
  });
});

describe("xDnaShares", () => {
  test("a man gets no X from his father", () => {
    const shares = xDnaShares(fullSlots("Male", 3));
    expect(shares[2]).toBe(0);
    expect(shares[3]).toBe(1);
    expect(shares[6]).toBe(0.5); // mother's father
    expect(shares[7]).toBe(0.5);
    expect(shares[12]).toBe(0); // mother's father's father
    expect(shares[13]).toBe(0.5); // mother's father's mother
  });

  test("a woman gets half from each parent; her father's half is his mother's", () => {
    const shares = xDnaShares(fullSlots("Female", 2));
    expect(shares[2]).toBe(0.5);
    expect(shares[3]).toBe(0.5);
    expect(shares[4]).toBe(0);
    expect(shares[5]).toBe(0.5);
  });

  test("no root gender, no shares", () => {
    expect(xDnaShares(fullSlots("", 2))).toBeNull();
  });

  test("the counts per generation are Fibonacci", () => {
    expect(xDnaRows(fullSlots("Male", 6)).map((row) => row.possible)).toEqual([1, 2, 3, 5, 8, 13]);
    expect(xDnaRows(fullSlots("Female", 5)).map((row) => row.possible)).toEqual([2, 3, 5, 8, 13]);
  });
});

describe("autosomalShare", () => {
  test("halves each generation and sums repeats", () => {
    const slots = fullSlots("Male", 3);
    expect(autosomalShare(slots, 2)).toBe(0.5);
    expect(autosomalShare(slots, 9)).toBe(0.125);
    slots[15] = slots[9]; // the same person twice
    expect(autosomalShare(slots, 9)).toBe(0.25);
  });

  test("percentText", () => {
    expect(percentText(0.5)).toBe("50%");
    expect(percentText(0.125)).toBe("12.5%");
    expect(percentText(1 / 32)).toBe("3.1%");
    expect(percentText(1 / 256)).toBe("0.39%");
  });
});

describe("buildXDnaSummary", () => {
  test("explains a man's X and lists the Fibonacci counts", () => {
    const slots = fullSlots("Male", 4);
    slots[13] = null;
    const text = buildXDnaSummary(slots, "Your");
    expect(text).toMatch(/As a man, you got your only X chromosome from your mother/);
    expect(text).toMatch(/• Parents: 1 of 2/);
    expect(text).toMatch(/• Great-grandparents: 3 of 8 \(2 on WikiTree\)/);
    expect(text).toMatch(/Fibonacci/);
    expect(text).toMatch(/1 missing X-DNA ancestor is outlined in purple/);
  });

  test("a woman, named", () => {
    expect(buildXDnaSummary(fullSlots("Female", 2), "Cook-8721's")).toMatch(/^Cook-8721, a woman, got one X chromosome from each parent, but her father passed on only his mother's/);
  });

  test("no gender", () => {
    expect(buildXDnaSummary(fullSlots("", 2), "Your")).toMatch(/no gender recorded/);
  });
});

describe("DNA confirmed chart", () => {
  const person = (name, fatherStatus = "", motherStatus = "") => ({ name, wtid: `${name}-1`, fatherStatus, motherStatus });
  // root's father confirmed with DNA, mother confident; father's father uncertain, father's mother not marked
  const slots = [null, person("Root", "30", "20"), person("Dad", "10", ""), person("Mum"), person("Grandad"), person("Gran"), null, null];

  test("statuses use the API codes (30 DNA, 20 confident, 10 uncertain, 5 non-biological)", () => {
    expect(parentLinkStatus(slots, 2)).toBe("dna");
    expect(parentLinkStatus(slots, 3)).toBe("confident");
    expect(parentLinkStatus(slots, 4)).toBe("uncertain");
    expect(parentLinkStatus(slots, 5)).toBe("unmarked");
    expect(parentLinkStatus([null, person("R", "5")], 2)).toBe("nonbio");
    expect(parentStatusCounts(slots)).toEqual({ dna: 1, confident: 1, unmarked: 1, uncertain: 1, nonbio: 0 });
  });

  test("summary names the confirmed and uncertain links", () => {
    const text = buildParentStatusSummary(slots, "Root's");
    expect(text).toMatch(/^Root's 4 ancestors in 2 generations, by how sure each parent link is: 1 confirmed with DNA, 1 confident/);
    expect(text).toMatch(/Confirmed with DNA:\n- Dad \(Dad-1\), father/);
    expect(text).toMatch(/uncertain \(worth a look\):\n- Grandad \(Grandad-1\), grandfather/);
  });

  test.each([
    ["DNA confirmed chart", ""],
    ["show my DNA-confirmed ancestors chart", "my"],
    ["which of her ancestors are DNA confirmed", "her"],
    ["Beacall-11's DNA confirmed fan chart", "Beacall-11"],
  ])("%s opens the fan chart in DNA confirmed mode", (prompt, owner) => {
    expect(parseDnaChartPrompt(prompt)).toMatchObject({ owner, mode: "dnaproof", dna: true });
  });

  test("questions about one profile stay text answers", () => {
    expect(parseDnaChartPrompt("is she DNA confirmed")).toBeNull();
    expect(parseDnaChartPrompt("my DNA-confirmed relationships")).toBeNull();
    expect(parseDnaChartPrompt("show my DNA confirmed ancestors")).toBeNull();
  });
});

describe("DNA confirmed chart routing", () => {
  test.each(["DNA confirmed chart", "show my DNA-confirmed ancestors chart", "which of my ancestors are DNA confirmed"])("%s routes to the fan chart", (prompt) => {
    const route = routeChatPrompt(prompt);
    expect(route.intent).toBe(ChatIntent.FAN_CHART);
    expect(route.params.mode).toBe("dnaproof");
    expect(isWtPlusOnlyPrompt(prompt)).toBe(false);
  });
  test("a CC7 search for DNA-confirmed links isn't a chart", () => {
    expect(routeChatPrompt("dna-confirmed in my CC7").intent).not.toBe(ChatIntent.FAN_CHART);
  });
});

describe("DNA lines", () => {
  test("Y follows fathers' fathers, mt mothers' mothers", () => {
    expect([2, 4, 8, 16].map(dnaLineOf)).toEqual(["y", "y", "y", "y"]);
    expect([3, 7, 15, 31].map(dnaLineOf)).toEqual(["mt", "mt", "mt", "mt"]);
    expect([1, 5, 6, 9, 14].map(dnaLineOf)).toEqual(["", "", "", "", ""]);
  });
  test("line ancestors and test summaries", () => {
    const slots = [null, { wtid: "R-1" }, { wtid: "F-1" }, { wtid: "M-1" }, { wtid: "FF-1" }, { wtid: "FM-1" }, null, null];
    expect(dnaLineAncestors(slots).map((a) => `${a.line}:${a.person.wtid}`)).toEqual(["y:F-1", "mt:M-1", "y:FF-1"]);
    const tests = [
      { dna_type: "yDNA", haplo: "R-BY207061", taker: { Name: "Maloney-2332" } },
      { dna_type: "yDNA", haplo: "R-BY207061", taker: { Name: "Maloney-1" } },
      { dna_type: "auDNA", haplo: "", taker: { Name: "X-1" } },
      { dna_type: "mtDNA", haplom: "H370", taker: { Name: "Maloney-2332" } },
    ];
    expect(lineTestSummary(tests, "y")).toEqual({ count: 2, haplogroups: ["R-BY207061"], takers: ["Maloney-2332", "Maloney-1"] });
    expect(lineTestSummary(tests, "mt")).toEqual({ count: 1, haplogroups: ["H370"], takers: ["Maloney-2332"] });
  });
  test("who carries the lines", () => {
    expect(dnaLineCarrierNote({ name: "Philip", gender: "Male" }, "y")).toBe("Philip carries this Y-DNA");
    expect(dnaLineCarrierNote({ name: "Ann", gender: "Female" }, "y")).toBe("Ann's father and brothers carry this Y-DNA");
    expect(dnaLineCarrierNote({ name: "Ann", gender: "Female" }, "mt")).toBe("Ann carries this mtDNA");
  });
});

describe("DNA lines prompts", () => {
  test.each([
    ["Y-DNA and mtDNA lines", ""],
    ["show my Y-DNA line", "my"],
    ["her mtDNA line chart", "her"],
    ["Y & mt lines", ""],
    ["Beacall-11's Y-DNA lineage", "Beacall-11"],
    ["who did I get my Y-DNA from", "my"],
    ["where did her mtDNA come from", "her"],
  ])("%s", (prompt, owner) => {
    expect(parseDnaChartPrompt(prompt)).toMatchObject({ owner, mode: "dnalines", dna: true });
    expect(routeChatPrompt(prompt).intent).toBe(ChatIntent.FAN_CHART);
  });
  test("haplogroup questions stay text answers", () => {
    expect(parseDnaChartPrompt("what is my Y-DNA haplogroup")).toBeNull();
    expect(routeChatPrompt("what is my Y-DNA haplogroup").intent).not.toBe(ChatIntent.FAN_CHART);
  });
});

test("DNA lines summary", () => {
  const slots = [null, { name: "Philip", gender: "Male", wtid: "B-11" }, { name: "John", wtid: "C-1", birth: "1790-00-00", birthLocation: "Cheshire" }, { name: "Eliza", wtid: "B-2" }, null, null, null, { name: "Ann", wtid: "T-3" }];
  const text = buildDnaLinesSummary(slots, "Philip's");
  expect(text).toMatch(/Y-DNA \(father to son\): back 1 generation to John \(C-1\), born 1790, Cheshire\. Philip carries this Y-DNA\./);
  expect(text).toMatch(/mtDNA \(mother to child\): back 2 generations to Ann \(T-3\)\. Philip carries this mtDNA\./);
});

describe("DNA carriers", () => {
  const p = (name, gender, extra = {}) => ({ name, wtid: `${name}-1`, gender, ...extra });
  const tree = {
    person: p("Philip", "Male"),
    children: [
      { person: p("Son", "Male"), children: [{ person: p("Grandson", "Male", { living: true, birth: "1950-01-01" }), children: [] }, { person: p("Granddaughter", "Female"), children: [] }] },
      { person: p("Daughter", "Female"), children: [{ person: p("DSon", "Male", { living: true }), children: [] }] },
    ],
  };
  test("a man's Y-DNA goes down the male line only", () => {
    expect(dnaCarriers(tree).map((c) => `${c.kind}:${c.person.name}`)).toEqual(["y:Son", "y:Grandson"]);
  });
  test("a woman's mtDNA reaches all her children but passes on only through daughters", () => {
    const mum = {
      person: p("Ann", "Female"),
      children: [
        { person: p("Girl", "Female"), children: [{ person: p("GirlsBoy", "Male"), children: [] }] },
        { person: p("Boy", "Male"), children: [{ person: p("BoysGirl", "Female"), children: [] }] },
      ],
    };
    expect(dnaCarriers(mum).map((c) => c.person.name)).toEqual(["Girl", "Boy", "GirlsBoy"]);
  });
  test("summary lists the living carriers", () => {
    const text = buildDnaCarrierSummary(tree, "Philip's", 5);
    expect(text).toMatch(/^Philip's Y-DNA \(passed from father to son\): 2 descendants on WikiTree within 5 generations carry it, 1 of them living\./);
    expect(text).toMatch(/could take a Y-DNA test:\n- Grandson \(Grandson-1\), grandchild, born 1950/);
    expect(text).not.toMatch(/DSon/);
  });
  test("carriers who have already tested are set apart", () => {
    const text = buildDnaCarrierSummary(tree, "Philip's", 5, ["Grandson-1", "Private-9"]);
    expect(text).toMatch(/Already tested: 2 Y-DNA tests are connected to Philip on WikiTree, taken by Grandson-1, Private-9\./);
    expect(text).toMatch(/Every living carrier on WikiTree has already tested\./);
    expect(text).not.toMatch(/could take a Y-DNA test:/);
  });
  test("brief leaves out the closing advice", () => {
    const full = buildDnaCarrierSummary(tree, "Philip's", 5);
    const brief = buildDnaCarrierSummary(tree, "Philip's", 5, [], { brief: true });
    expect(full).toMatch(/Philip's mtDNA came from his mother/);
    expect(full).toMatch(/A test only proves the line/);
    expect(brief).not.toMatch(/mtDNA came from his mother/);
    expect(brief).not.toMatch(/A test only proves/);
    expect(brief).toMatch(/could take a Y-DNA test:\n- Grandson \(Grandson-1\)/);
    expect(full.startsWith(brief)).toBe(true);
  });
});

describe("DNA line sharers (living testers)", () => {
  test("furthest recorded ancestor on each line", () => {
    const full = furthestLineAncestors(fullSlots("Male", 5));
    expect(full.y).toMatchObject({ slot: 32, line: "y", generation: 5, person: { wtid: "P-32" } });
    expect(full.mt).toMatchObject({ slot: 63, line: "mt", generation: 5, person: { wtid: "P-63" } });
    const sparse = [null, { wtid: "R-1" }, { wtid: "F-1" }, { wtid: "M-1" }, { wtid: "FF-1" }, null, null, null];
    const found = furthestLineAncestors(sparse);
    expect(found.y).toMatchObject({ slot: 4, generation: 2, person: { wtid: "FF-1" } });
    expect(found.mt).toMatchObject({ slot: 3, generation: 1, person: { wtid: "M-1" } });
    expect(furthestLineAncestors([null, { wtid: "R-1" }])).toEqual({ y: null, mt: null });
    expect(furthestLineAncestors(null)).toEqual({ y: null, mt: null });
  });
  test("heading names the line and its furthest ancestor", () => {
    const william = { generation: 5, person: { name: "William", wtid: "Moloney-741", birth: "1760-00-00" } };
    expect(lineSharersHeading({ name: "Murray", gender: "Male" }, "y", william)).toBe(
      "Murray's Y-DNA line goes back 5 generations to William (Moloney-741), born 1760. Everyone below who carries it shares it with Murray."
    );
    const mum = { generation: 1, person: { name: "Mary", wtid: "Smith-1" } };
    expect(lineSharersHeading({ name: "Ann", gender: "Female" }, "mt", mum)).toBe(
      "Ann's mtDNA line goes back 1 generation to Mary (Smith-1). Everyone below who carries it shares it with Ann."
    );
    expect(lineSharersHeading({ name: "Ann", gender: "Female" }, "y", william)).toMatch(/^Ann's father's Y-DNA line goes back 5 generations/);
    expect(lineSharersHeading({ wtid: "X-1" }, "mt", mum)).toMatch(/^X-1's mtDNA line/);
    expect(lineSharersHeading(null, "mt", mum)).toMatch(/^This person's mtDNA line/);
  });
  test("descendant generations to load reach today, between 4 and 10", () => {
    expect(lineSharersGenerations({ generation: 5 })).toBe(8);
    expect(lineSharersGenerations({ generation: 1 })).toBe(4);
    expect(lineSharersGenerations({ generation: 9 })).toBe(10);
    expect(lineSharersGenerations(null)).toBe(4);
  });
});

describe("DNA carriers prompts", () => {
  test.each([
    ["who could take a DNA test for him", "his"],
    ["Who could do a Y-DNA test for Beacall-13?", "Beacall-13"],
    ["who could take a DNA test to prove Beacall-13's line", "Beacall-13"],
    ["who carries his Y-DNA", "his"],
    ["who has her mtDNA", "her"],
    ["Beacall-13's DNA carriers", "Beacall-13"],
    ["DNA test candidates for her", "her"],
    ["who could take a DNA test for this person", ""],
  ])("%s", (prompt, owner) => {
    expect(parseDnaCarrierPrompt(prompt)).toMatchObject({ owner, mode: "dnacarriers", dna: true });
    expect(routeChatPrompt(prompt)).toMatchObject({ intent: ChatIntent.DESCENDANT_CHART, params: { mode: "dnacarriers" } });
  });
  test.each(["what DNA tests has she taken", "has she taken a DNA test", "what is his Y-DNA haplogroup"])("%s isn't a carriers chart", (prompt) => {
    expect(parseDnaCarrierPrompt(prompt)).toBeNull();
  });
});

test("private children of carriers are counted as possible carriers", () => {
  const tree = {
    person: { name: "T", gender: "Male" },
    children: [
      { person: { name: "S", gender: "Male" }, children: [{ person: { hidden: true }, children: [] }, { person: { hidden: true }, children: [] }] },
      { person: { name: "D", gender: "Female" }, children: [{ person: { hidden: true }, children: [] }] },
    ],
  };
  expect(hiddenCarrierChildren(tree)).toBe(2);
  expect(buildDnaCarrierSummary(tree, "T's", 3)).toMatch(/2 private profiles are children of carriers/);
});
