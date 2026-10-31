import { describe, expect, it } from "vitest";

import {
  extractPitchScriptCommand,
} from "../src/discord.js";

describe("extractPitchScriptCommand", () => {
  const botId = "123456789012345678";

  it("extracts a command from a standard bot mention", () => {
    expect(
      extractPitchScriptCommand(
        `<@${botId}> run VIEW > CLUB > Example FC > RARITY`,
        botId,
      ),
    ).toBe("VIEW > CLUB > Example FC > RARITY");
  });

  it("supports the alternate mention format", () => {
    expect(
      extractPitchScriptCommand(
        `<@!${botId}> run VIEW > CLUB > Example FC`,
        botId,
      ),
    ).toBe("VIEW > CLUB > Example FC");
  });

  it("accepts multiline scripts", () => {
    expect(
      extractPitchScriptCommand(
        `<@${botId}> run VIEW > CLUB > Example FC\nVIEW > CLUB > Another FC`,
        botId,
      ),
    ).toBe(
      "VIEW > CLUB > Example FC\nVIEW > CLUB > Another FC",
    );
  });

  it("ignores messages that do not begin with the bot mention and run", () => {
    expect(
      extractPitchScriptCommand(
        "VIEW > CLUB > Example FC",
        botId,
      ),
    ).toBeUndefined();

    expect(
      extractPitchScriptCommand(
        `<@${botId}> about`,
        botId,
      ),
    ).toBeUndefined();
  });

  it("does not match a different bot ID", () => {
    expect(
      extractPitchScriptCommand(
        "<@999999999999999999> run VIEW > CLUB > Example FC",
        botId,
      ),
    ).toBeUndefined();
  });
});
