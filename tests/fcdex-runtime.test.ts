import { describe, expect, it, vi } from "vitest";

import {
  createFCDexPitchScript,
} from "../src/fcdex-runtime.js";

import type {
  PitchScriptCommandContext,
} from "../src/host.js";

function createMockPrisma() {
  const club = {
    id: 1n,
    country: "Example FC",
    health: 10,
    attack: 10,
    rarity: 5,
    emojiId: 100n,
    wildCard: "example.png",
    collectionCard: "example-card.png",
    credits: "Test",
    capacityName: "Example",
    capacityDescription: "Description",
    capacityLogic: {},
    enabled: true,
    shortName: null,
    catchNames: null,
    tradeable: true,
    createdAt: null,
    translations: null,
    economyId: null,
    regimeId: null,
  };

  const ball = {
    findMany: vi.fn(async () => [
      { country: "Example FC" },
    ]),
    findUnique: vi.fn(async () => ({ ...club })),
    create: vi.fn(async () => ({ ...club })),
    update: vi.fn(async () => ({ ...club })),
    delete: vi.fn(async () => ({ ...club })),
    updateMany: vi.fn(async () => ({ count: 1 })),
    deleteMany: vi.fn(async () => ({ count: 1 })),
  };

  const special = {
    findMany: vi.fn(async () => []),
    findUnique: vi.fn(async () => null),
    create: vi.fn(async () => ({})),
    update: vi.fn(async () => ({})),
    delete: vi.fn(async () => ({})),
    updateMany: vi.fn(async () => ({ count: 0 })),
    deleteMany: vi.fn(async () => ({ count: 0 })),
  };

  return {
    prisma: { ball, special },
  };
}

function createContext(): PitchScriptCommandContext {
  return {
    send: vi.fn(async () => {}),
    sendList: vi.fn(async () => {}),
    attachments: [],
  };
}

describe("FCDex PitchScript runtime", () => {
  it("runs a VIEW command against the Ball model", async () => {
    const { prisma } = createMockPrisma();

    const pitchScript = createFCDexPitchScript(prisma);
    const context = createContext();

    const result = await pitchScript.execute(
      "VIEW > CLUB > Example FC > RARITY",
      context,
    );

    expect(result).toBeUndefined();

    expect(context.send).toHaveBeenCalledWith(
      "```5```",
    );
  });

  it("returns the original invalid-command error", async () => {
    const { prisma } = createMockPrisma();

    const pitchScript = createFCDexPitchScript(prisma);
    const context = createContext();

    const result = await pitchScript.execute(
      "UNKNOWN > CLUB",
      context,
    );

    expect(result).toBe(
      "'UNKNOWN' is not a valid command.",
    );

    expect(context.send).not.toHaveBeenCalled();
  });

  it("executes multiple commands in order", async () => {
    const { prisma } = createMockPrisma();

    const pitchScript = createFCDexPitchScript(prisma);
    const context = createContext();

    await pitchScript.execute(
      [
        "VIEW > CLUB > Example FC > RARITY",
        "VIEW > CLUB > Example FC > HEALTH",
      ].join("\n"),
      context,
    );

    expect(context.send).toHaveBeenNthCalledWith(
      1,
      "```5```",
    );

    expect(context.send).toHaveBeenNthCalledWith(
      2,
      "```10```",
    );
  });
});
