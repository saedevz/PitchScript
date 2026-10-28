import { describe, expect, it } from "vitest";

import { PitchScriptParser } from "../src/parser.js";
import { PitchScriptDispatcher } from "../src/dispatcher.js";

interface TestContext {
  outputs: string[];
}

const parser = new PitchScriptParser({
  globalMethods: ["view", "update"],
  commandClasses: ["Filter"],
  models: [
    {
      name: "Club",
      identifierField: "name",
      value: { modelName: "Club" }
    }
  ]
});

function createDispatcher() {
  return new PitchScriptDispatcher<TestContext>({
    global: () => ({
      methods: {
        view: async (context, ...args) => {
          context.outputs.push(
            `VIEW:${args.map((arg) => arg.name).join("|")}`
          );
        }
      }
    }),

    commandClasses: {
      Filter: () => ({
        methods: {
          update: async (context, ...args) => {
            context.outputs.push(
              `FILTER.UPDATE:${args.map((arg) => arg.name).join("|")}`
            );
          }
        }
      })
    }
  });
}

describe("PitchScriptDispatcher", () => {
  it("dispatches global commands", async () => {
    const context: TestContext = { outputs: [] };

    const script = parser.parse(
      "VIEW > CLUB > Manchester City > RARITY"
    );

    const result = await createDispatcher().execute(
      script,
      context
    );

    expect(result).toBeUndefined();

    expect(context.outputs).toEqual([
      "VIEW:Club|Manchester City|RARITY"
    ]);
  });

  it("dispatches command-class methods", async () => {
    const context: TestContext = { outputs: [] };

    const script = parser.parse(
      "FILTER > UPDATE > CLUB > RARITY > T5 > T3"
    );

    const result = await createDispatcher().execute(
      script,
      context
    );

    expect(result).toBeUndefined();

    expect(context.outputs).toEqual([
      "FILTER.UPDATE:Club|RARITY|T5|T3"
    ]);
  });

  it("executes multiple commands sequentially", async () => {
    const context: TestContext = { outputs: [] };

    const script = parser.parse(
      "VIEW > CLUB > Manchester City > RARITY\n" +
      "FILTER > UPDATE > CLUB > RARITY > T5 > T3"
    );

    await createDispatcher().execute(script, context);

    expect(context.outputs).toHaveLength(2);
    expect(context.outputs[0]).toContain("VIEW:");
    expect(context.outputs[1]).toContain("FILTER.UPDATE:");
  });

  it("returns an error for an invalid command", async () => {
    const context: TestContext = { outputs: [] };

    const script = parser.parse("UNKNOWN > CLUB");

    await expect(
      createDispatcher().execute(script, context)
    ).resolves.toBe("'UNKNOWN' is not a valid command.");
  });

  it("preserves shared attachment state across commands", async () => {
    const attachments = ["cover.png"];
    const context: TestContext = { outputs: [] };

    const dispatcher =
      new PitchScriptDispatcher<TestContext>({
        global: (shared) => ({
          methods: {
            view: async (ctx) => {
              ctx.outputs.push(
                `attachments:${shared.attachments.length}`
              );

              shared.attachments.pop();
            }
          }
        }),

        commandClasses: {
          Filter: (shared) => ({
            methods: {
              update: async (ctx) => {
                ctx.outputs.push(
                  `attachments:${shared.attachments.length}`
                );
              }
            }
          })
        }
      });

    const script = parser.parse(
      "VIEW > CLUB > Manchester City > RARITY\n" +
      "FILTER > UPDATE > CLUB > RARITY > T5 > T3"
    );

    await dispatcher.execute(script, context, attachments);

    expect(context.outputs).toEqual([
      "attachments:1",
      "attachments:0"
    ]);
  });
});
