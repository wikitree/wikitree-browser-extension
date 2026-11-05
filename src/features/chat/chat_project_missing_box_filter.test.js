import { isLikelyProjectMissingBoxPrompt, parseProjectMissingBoxPrompt } from "./chat_project_missing_box_filter";

describe("chat_project_missing_box_filter prompt parsing", () => {
  test("parses project prompt with explicit project suffix", () => {
    const result = parseProjectMissingBoxPrompt("Profiles in England project but missing project box in bio");

    expect(result).toEqual({
      projectName: "England Project",
      templateHint: "England",
      understood: "profiles in England Project but missing the project box in the bio",
    });
  });

  test("parses project prompt and infers project suffix", () => {
    const result = parseProjectMissingBoxPrompt("people in Acadians but missing the project box in biography");

    expect(result).toEqual({
      projectName: "Acadians Project",
      templateHint: "Acadians",
      understood: "profiles in Acadians Project but missing the project box in the bio",
    });
  });

  test("detects project missing-box phrasing", () => {
    expect(isLikelyProjectMissingBoxPrompt("Profiles in England project but missing project box in bio")).toBe(true);
    expect(isLikelyProjectMissingBoxPrompt("Staffordshire 1850-1900 married but no children listed")).toBe(false);
  });

  test("parses prompt wrapped in backticks", () => {
    const result = parseProjectMissingBoxPrompt("`Profiles in England project but missing project box in bio`");

    expect(result).toEqual({
      projectName: "England Project",
      templateHint: "England",
      understood: "profiles in England Project but missing the project box in the bio",
    });
  });

  test("parses managed-by prompt with 'with no project box' wording", () => {
    const result = parseProjectMissingBoxPrompt("Profiles managed by England Project but with no project box.");

    expect(result).toEqual({
      projectName: "England Project",
      templateHint: "England",
      understood: "profiles in England Project but missing the project box in the bio",
    });
  });

  test("parses managed-by prompt with 'without project box' wording", () => {
    const result = parseProjectMissingBoxPrompt("Profiles managed by England Project and without project box");

    expect(result).toEqual({
      projectName: "England Project",
      templateHint: "England",
      understood: "profiles in England Project but missing the project box in the bio",
    });
  });
});

describe("project missing box: other wordings (variant testing, 2026-10-02)", () => {
  test.each([
    "England project profiles without a project box",
    "England Project managed profiles missing the project box",
    "profiles managed by the England project with no project box",
    "Profiles in England project but missing project box in bio",
  ])("%s", (prompt) => {
    expect(parseProjectMissingBoxPrompt(prompt)?.projectName).toBe("England Project");
  });

  test("not without a project name or a missing box", () => {
    expect(parseProjectMissingBoxPrompt("profiles without a project box")).toBeNull();
    expect(parseProjectMissingBoxPrompt("England project profiles")).toBeNull();
  });
});
