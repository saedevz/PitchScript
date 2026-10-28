import { describe, expect, it } from "vitest";
import { parsePitchScript } from "../src/parser.js";
import { validateCommand } from "../src/validate.js";

describe("validateCommand", () => {
  it("accepts a club rarity query", () => {
    const command = parsePitchScript(
      "VIEW > CLUB > Manchester City > RARITY >",
    );

    expect(() => validateCommand(command)).not.toThrow();
  });

  it("rejects an unsupported resource", () => {
    const command = parsePitchScript(
      "VIEW > STADIUM > Wembley > NAME >",
    );

    expect(() => validateCommand(command)).toThrow(
      "Unsupported resource: STADIUM",
    );
  });

  it("rejects UPDATE without a value", () => {
    const command = parsePitchScript(
      "UPDATE > CLUB > Manchester City",
    );

    expect(() => validateCommand(command)).toThrow(
      "UPDATE requires a resource name, property, and value.",
    );
  });
});
