import { describe, expect, it } from "vitest";

import { PitchScriptParser } from "../src/parser.js";
import { ValueType } from "../src/types.js";
import { createFCDexParserRegistry } from "../src/fcdex-models.js";

const parser = new PitchScriptParser(
  createFCDexParserRegistry(),
);

describe("DexScript command compatibility", () => {
  it.each([
    "CREATE > CLUB > Example FC",
    "DELETE > CLUB > Example FC",
    "UPDATE > CLUB > Example FC > RARITY > T5",
    "VIEW > CLUB > Example FC > RARITY",
    "ATTRIBUTES > CLUB",
  ])("recognizes global command: %s", (source) => {
    const parsed = parser.parse(source);

    expect(parsed[0]?.[0]?.type).toBe(ValueType.METHOD);
  });

  it.each([
    "FILTER > UPDATE > CLUB > RARITY > T5 > T3",
    "FILTER > DELETE > CLUB > RARITY > T5",
    "FILTER > VIEW > CLUB > RARITY > T5",
    "EVAL > SAVE > rarity-update",
    "EVAL > REMOVE > rarity-update",
    "EVAL > LIST",
    "EVAL > RUN > rarity-update",
    "FILE > READ > README.md",
    "FILE > WRITE > output.txt",
    "FILE > CLEAR > output.txt",
    "FILE > LISTDIR",
    "FILE > DELETE > output.txt",
    "TEMPLATE > CREATE > CLUB",
  ])("recognizes command class: %s", (source) => {
    const parsed = parser.parse(source);

    expect(parsed[0]?.[0]?.type).toBe(ValueType.CLASS);
  });

  it("recognizes a case-insensitive CLUB model", () => {
    const parsed = parser.parse(
      "VIEW > cLuB > Example FC > RARITY",
    );

    expect(parsed[0]?.[1]).toMatchObject({
      name: "Club",
      type: ValueType.MODEL,
      extraData: ["country"],
    });
  });

  it("preserves the original comment behavior", () => {
    const parsed = parser.parse(
      [
        "-- ignored comment",
        "VIEW > CLUB > Example FC > RARITY",
        "",
        "VIEW > CLUB > Another FC > RARITY",
      ].join("\n"),
    );

    expect(parsed).toHaveLength(2);
  });

  it("preserves boolean recognition", () => {
    expect(parser.createValue("true")).toMatchObject({
      type: ValueType.BOOLEAN,
      value: true,
    });

    expect(parser.createValue("FALSE")).toMatchObject({
      type: ValueType.BOOLEAN,
      value: false,
    });
  });
});
