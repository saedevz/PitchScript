import { describe, expect, it } from "vitest";
import { parsePitchScript } from "../src/parser.js";

describe("parsePitchScript", () => {
  it("parses a club rarity query", () => {
    const command = parsePitchScript(
      "VIEW > CLUB > Manchester City > RARITY >",
    );

    expect(command).toEqual({
      operation: "VIEW",
      resource: "CLUB",
      arguments: ["Manchester City", "RARITY"],
    });
  });

  it("normalizes the operation and resource", () => {
    const command = parsePitchScript(
      "view > club > Manchester City > RARITY >",
    );

    expect(command.operation).toBe("VIEW");
    expect(command.resource).toBe("CLUB");
  });

  it("rejects a command without a resource", () => {
    expect(() => parsePitchScript("VIEW")).toThrow(
      "Invalid command",
    );
  });

  it("rejects an unsupported operation", () => {
    expect(() =>
      parsePitchScript("EXECUTE > CLUB > Manchester City"),
    ).toThrow("Unsupported operation");
  });
});
