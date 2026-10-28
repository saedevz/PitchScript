import { describe, expect, it } from "vitest";

import {
  autocorrect,
  fetchModel,
  imagePath,
  isImage,
  pascalCase,
  removeCodeMarkdown,
} from "../src/utils.js";

describe("pascalCase", () => {
  it("converts underscore-separated names", () => {
    expect(pascalCase("club_name")).toBe("ClubName");
  });

  it("converts lowercase names", () => {
    expect(pascalCase("club")).toBe("Club");
  });

  it("handles empty input", () => {
    expect(pascalCase("")).toBe("");
  });
});

describe("autocorrect", () => {
  it("returns an exact match", () => {
    expect(
      autocorrect("Manchester City", [
        "Manchester City",
        "Manchester United",
      ]),
    ).toBe("Manchester City");
  });

  it("suggests a close match but rejects the incorrect input", () => {
    expect(() =>
      autocorrect("Manchster City", [
        "Manchester City",
        "Manchester United",
      ]),
    ).toThrow("Did you mean 'Manchester City'?");
  });

  it("uses the supplied error text when no close match exists", () => {
    expect(() =>
      autocorrect("Unrelated", ["Manchester City"], "was not found."),
    ).toThrow("'Unrelated' was not found.");
  });
});

describe("removeCodeMarkdown", () => {
  it("removes a fenced code block", () => {
    expect(
      removeCodeMarkdown("```sql\nVIEW > CLUB > Example\n```"),
    ).toBe("\nVIEW > CLUB > Example\n");
  });

  it("trims surrounding backticks and whitespace", () => {
    expect(removeCodeMarkdown(" `VIEW > CLUB > Example` ")).toBe(
      "VIEW > CLUB > Example",
    );
  });
});

describe("image helpers", () => {
  it("returns a media path", () => {
    expect(imagePath("/static/uploads/example.png")).toMatch(
      /example\.png$/,
    );
  });

  it("returns false for a nonexistent image", () => {
    expect(isImage("/static/uploads/not-a-real-file.png")).toBe(false);
  });
});

describe("fetchModel", () => {
  it("resolves a registered model name", () => {
    const clubModel = { name: "Club" };
    const models = new Map([["club", clubModel]]);

    expect(fetchModel("club", models)).toBe(clubModel);
  });

  it("returns undefined for an unknown model", () => {
    expect(fetchModel("unknown", new Map())).toBeUndefined();
  });
});
