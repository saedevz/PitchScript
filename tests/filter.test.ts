import { describe, expect, it, vi } from "vitest";

import { PitchScriptParser } from "../src/parser.js";
import { createFilterCommands } from "../src/commands/filter.js";
import type {
  PitchScriptCommandContext,
} from "../src/host.js";
import type {
  PitchScriptFilterHost,
} from "../src/commands/filter.js";

const clubModel = { modelName: "Club" };

const parser = new PitchScriptParser({
  globalMethods: [
    "create",
    "delete",
    "update",
    "view",
    "attributes",
  ],
  commandClasses: ["Filter", "Eval", "File", "Template"],
  models: [
    {
      name: "Club",
      identifierField: "name",
      value: clubModel,
    },
  ],
});

function createFixture() {
  const host: PitchScriptFilterHost = {
    hasAttribute: vi.fn(() => true),

    getModel: vi.fn(async (_model, identifier) => ({
      name: identifier,
    })),

    filterUpdate: vi.fn(async () => {}),
    filterDelete: vi.fn(async () => {}),

    filterValues: vi.fn(async () => [
      "Manchester City",
    ]),
  };

  const context: PitchScriptCommandContext = {
    send: vi.fn(async () => {}),
    sendList: vi.fn(async () => {}),
  };

  const commands = createFilterCommands(host)({
    attachments: [],
  });

  return { host, context, commands };
}

async function runFilterCommand(
  source: string,
  method: "update" | "delete" | "view",
) {
  const fixture = createFixture();
  const line = parser.parse(source)[0];

  if (!line) {
    throw new Error("Test command did not parse.");
  }

  await fixture.commands.methods[method](
    fixture.context,
    ...line.slice(2),
  );

  return fixture;
}

describe("Filter commands", () => {
  it("updates matching records", async () => {
    const { host, context } = await runFilterCommand(
      "FILTER > UPDATE > CLUB > RARITY > T5 > T3",
      "update",
    );

    expect(host.filterUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Club" }),
      "rarity",
      "T5",
      "T3",
    );

    expect(context.send).toHaveBeenCalledWith(
      "Updated all `Club` instances from a `RARITY` value " +
        "of `T5` to `T3`",
    );
  });

  it("passes the optional filtering operator through", async () => {
    const { host } = await runFilterCommand(
      "FILTER > DELETE > CLUB > RARITY > T5 > GT",
      "delete",
    );

    expect(host.filterDelete).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Club" }),
      "rarity__gt",
      "T5",
    );
  });

  it("lists matching record identifiers", async () => {
    const { host, context } = await runFilterCommand(
      "FILTER > VIEW > CLUB > RARITY > T5",
      "view",
    );

    expect(host.filterValues).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Club" }),
      "rarity",
      "T5",
      "name",
    );

    expect(context.sendList).toHaveBeenCalledWith([
      "Manchester City",
    ]);
  });

  it("reports when no records match", async () => {
    const fixture = createFixture();

    vi.mocked(fixture.host.filterValues).mockResolvedValueOnce([]);

    const line = parser.parse(
      "FILTER > VIEW > CLUB > RARITY > T5",
    )[0]!;

    await fixture.commands.methods.view(
      fixture.context,
      ...line.slice(2),
    );

    expect(fixture.context.send).toHaveBeenCalledWith(
      "No Clubs found with a `RARITY` value of `T5`",
    );
  });

  it("rejects an invalid attribute", async () => {
    const fixture = createFixture();

    vi.mocked(fixture.host.hasAttribute).mockReturnValue(false);

    const line = parser.parse(
      "FILTER > DELETE > CLUB > UNKNOWN > T5",
    )[0]!;

    await expect(
      fixture.commands.methods.delete(
        fixture.context,
        ...line.slice(2),
      ),
    ).rejects.toThrow("is not a valid Club attribute");

    expect(fixture.host.filterDelete).not.toHaveBeenCalled();
  });
});
