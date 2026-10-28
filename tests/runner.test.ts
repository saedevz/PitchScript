import { describe, expect, it, vi } from "vitest";

import {
  removeCodeMarkdown,
  runPitchScript,
  type PitchScriptExecutor,
  type PitchScriptRunnerContext,
} from "../src/runner.js";

import { PitchScriptParser } from "../src/parser.js";

const parser = new PitchScriptParser({
  globalMethods: ["view", "update", "delete", "create", "attributes"],
  commandClasses: ["Filter", "Eval", "File", "Template"],
  models: [
    {
      name: "Club",
      identifierField: "name",
      value: { modelName: "Club" },
    },
  ],
});

function createContext(): PitchScriptRunnerContext {
  return {
    attachments: [],
    send: vi.fn(async () => {}),
    sendList: vi.fn(async () => {}),
    addReaction: vi.fn(async () => {}),
  };
}

describe("removeCodeMarkdown", () => {
  it("removes SQL code fences", () => {
    expect(
      removeCodeMarkdown(
        "```sql\nVIEW > CLUB > Example FC > RARITY >\n```",
      ),
    ).toBe("\nVIEW > CLUB > Example FC > RARITY >\n");
  });

  it("trims surrounding backticks and whitespace without a code block", () => {
    expect(
      removeCodeMarkdown(
        " `VIEW > CLUB > Example FC > RARITY >` ",
      ),
    ).toBe("VIEW > CLUB > Example FC > RARITY >");
  });
});

describe("runPitchScript", () => {
  it("executes parsed commands and reacts on success", async () => {
    const context = createContext();

    const executor: PitchScriptExecutor<PitchScriptRunnerContext> = {
      execute: vi.fn(async () => undefined),
    };

    await runPitchScript(
      "VIEW > CLUB > Example FC > RARITY >",
      parser,
      executor,
      context,
    );

    expect(executor.execute).toHaveBeenCalledOnce();
    expect(context.addReaction).toHaveBeenCalledWith("✅");
    expect(context.send).not.toHaveBeenCalled();
  });

  it("sends an error when execution returns an error message", async () => {
    const context = createContext();

    const executor: PitchScriptExecutor<PitchScriptRunnerContext> = {
      execute: vi.fn(async () => "'UNKNOWN' is not a valid command."),
    };

    await runPitchScript(
      "UNKNOWN > CLUB",
      parser,
      executor,
      context,
    );

    expect(context.send).toHaveBeenCalledWith(
      "```ERROR: 'UNKNOWN' is not a valid command.```",
    );

    expect(context.addReaction).not.toHaveBeenCalled();
  });

  it("reports exceptions thrown during execution", async () => {
    const context = createContext();

    const executor: PitchScriptExecutor<PitchScriptRunnerContext> = {
      execute: vi.fn(async () => {
        throw new Error("Test execution failure");
      }),
    };

    await runPitchScript(
      "VIEW > CLUB > Example FC > RARITY",
      parser,
      executor,
      context,
    );

    expect(context.send).toHaveBeenCalledWith(
      "```ERROR: Test execution failure```",
    );

    expect(context.addReaction).not.toHaveBeenCalled();
  });

  it("includes a stack trace in debug mode when available", async () => {
    const context = createContext();

    const executor: PitchScriptExecutor<PitchScriptRunnerContext> = {
      execute: vi.fn(async () => {
        throw new Error("Debug failure");
      }),
    };

    await runPitchScript(
      "VIEW > CLUB > Example FC > RARITY",
      parser,
      executor,
      context,
      { debug: true },
    );

    const sentMessage = vi.mocked(context.send).mock.calls[0]?.[0];

    expect(sentMessage).toContain("Debug failure");
    expect(sentMessage).toContain("Error:");
  });

  it("passes message attachments to the executor", async () => {
    const context = createContext();
    context.attachments.push("example.png");

    const executor: PitchScriptExecutor<PitchScriptRunnerContext> = {
      execute: vi.fn(async () => undefined),
    };

    await runPitchScript(
      "VIEW > CLUB > Example FC > RARITY",
      parser,
      executor,
      context,
    );

    expect(executor.execute).toHaveBeenCalledWith(
      expect.any(Array),
      context,
      ["example.png"],
    );
  });
});
