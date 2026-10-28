import { describe, expect, it, vi } from "vitest";

import { createGlobalCommands } from "../src/commands/global.js";
import { PitchScriptParser } from "../src/parser.js";
import type {
  PitchScriptCommandContext,
  PitchScriptHost,
} from "../src/host.js";

const modelValue = { modelName: "Club" };

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
      value: modelValue,
    },
  ],
});

function makeHost() {
  const record: Record<string, unknown> = {
    name: "Manchester City",
    rarity: "T5",
    country: "England",
  };

  const host: PitchScriptHost = {
    createModel: vi.fn(async () => {}),
    getModel: vi.fn(async () => record),
    deleteRecord: vi.fn(async () => {}),

    getFields: () => [
      {
        name: "name",
        typeName: "CharField",
        nullable: false,
        maxLength: 200,
      },
      {
        name: "rarity",
        typeName: "CharField",
        nullable: false,
        maxLength: 20,
      },
      {
        name: "country",
        typeName: "CharField",
        nullable: false,
        maxLength: 100,
      },
    ],

    hasAttribute: (_model, attribute) =>
      Object.hasOwn(record, attribute),

    getRecordEntries: (value) =>
      Object.entries(value as Record<string, unknown>),

    getRecordValue: (value, attribute) =>
      (value as Record<string, unknown>)[attribute],

    setRecordValue: (value, attribute, newValue) => {
      (value as Record<string, unknown>)[attribute] = newValue;
    },

    saveRecord: vi.fn(async () => {}),
    getPrimaryKey: () => "record-1",
    getRelatedIdentifiers: vi.fn(async () => []),
    saveAttachment: vi.fn(async () => "image.png"),
    uploadedImageValue: (path) => `/${path}`,
    isImage: () => false,
    imagePath: (path) => path,
    formatValue: (value) => String(value),
  };

  return { host, record };
}

function makeContext(): PitchScriptCommandContext {
  return {
    send: vi.fn(async () => {}),
    sendList: vi.fn(async () => {}),
  };
}

describe("Global commands", () => {
  it("creates a model using its identifier", async () => {
    const { host } = makeHost();
    const context = makeContext();
    const shared = { attachments: [] };

    const commands = createGlobalCommands(host)(shared);
    const line = parser.parse(
      "CREATE > CLUB > Manchester City",
    )[0]!;

    await commands.methods.create(
      context,
      ...line.slice(1),
    );

    expect(host.createModel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Club" }),
      "Manchester City",
    );

    expect(context.send).toHaveBeenCalledWith(
      "Created `Manchester City` club",
    );
  });

  it("updates an attribute and saves only that field", async () => {
    const { host, record } = makeHost();
    const context = makeContext();
    const commands = createGlobalCommands(host)({
      attachments: [],
    });

    const line = parser.parse(
      "UPDATE > CLUB > Manchester City > RARITY > T3",
    )[0]!;

    await commands.methods.update(
      context,
      ...line.slice(1),
    );

    expect(record.rarity).toBe("T3");
    expect(host.saveRecord).toHaveBeenCalledWith(
      record,
      ["rarity"],
    );

    expect(context.send).toHaveBeenCalledWith(
      "Updated `Manchester City's` RARITY to `T3`",
    );
  });

  it("views a single attribute using a code block", async () => {
    const { host } = makeHost();
    const context = makeContext();
    const commands = createGlobalCommands(host)({
      attachments: [],
    });

    const line = parser.parse(
      "VIEW > CLUB > Manchester City > RARITY",
    )[0]!;

    await commands.methods.view(
      context,
      ...line.slice(1),
    );

    expect(context.send).toHaveBeenCalledWith(
      "```T5```",
    );
  });
});
