import { describe, expect, it } from "vitest";

import { PitchScriptParser } from "../src/parser.js";
import { ValueType } from "../src/types.js";

const clubModel = {
  modelName: "Club"
};

const parser = new PitchScriptParser({
  globalMethods: [
    "create",
    "delete",
    "update",
    "view",
    "attributes"
  ],

  commandClasses: [
    "Filter",
    "Eval",
    "File",
    "Template"
  ],

  models: [
    {
      name: "Club",
      identifierField: "name",
      value: clubModel
    }
  ]
});

describe("PitchScriptParser", () => {
  it("parses a standard update command", () => {
    const parsed = parser.parse(
      "UPDATE > CLUB > Manchester City > RARITY > T5"
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveLength(5);

    expect(parsed[0]?.[0]).toMatchObject({
      name: "UPDATE",
      type: ValueType.METHOD
    });

    expect(parsed[0]?.[1]).toMatchObject({
      name: "Club",
      type: ValueType.MODEL,
      value: clubModel,
      extraData: ["name"]
    });

    expect(parsed[0]?.[2]).toMatchObject({
      name: "Manchester City",
      type: ValueType.DEFAULT,
      value: "Manchester City"
    });

    expect(parsed[0]?.[3]?.value).toBe("RARITY");
    expect(parsed[0]?.[4]?.value).toBe("T5");
  });

  it("recognizes command classes", () => {
    const value = parser.createValue("FILTER");

    expect(value.type).toBe(ValueType.CLASS);
  });

  it("recognizes booleans case-insensitively", () => {
    expect(parser.createValue("TRUE")).toMatchObject({
      name: "TRUE",
      type: ValueType.BOOLEAN,
      value: true
    });

    expect(parser.createValue("false")).toMatchObject({
      type: ValueType.BOOLEAN,
      value: false
    });
  });

  it("recognizes a JavaScript-parseable date with two hyphens", () => {
    const value = parser.createValue("2024-05-20");

    expect(value.type).toBe(ValueType.DATETIME);
    expect(value.value).toBeInstanceOf(Date);
  });

  it("ignores blank lines and comment lines", () => {
    const parsed = parser.parse(
      "-- this is a comment\n\nVIEW > CLUB > Manchester City > RARITY\n"
    );

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toHaveLength(4);
  });

  it("parses multiple commands in order", () => {
    const parsed = parser.parse(
      "CREATE > CLUB > Manchester City\n" +
      "DELETE > CLUB > Manchester City"
    );

    expect(parsed).toHaveLength(2);
    expect(parsed[0]?.[0]?.name).toBe("CREATE");
    expect(parsed[1]?.[0]?.name).toBe("DELETE");
  });
});
