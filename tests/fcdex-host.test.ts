import { describe, expect, it, vi } from "vitest";

import {
  createFCDexHost,
} from "../src/fcdex-host.js";

import {
  createFCDexParserRegistry,
} from "../src/fcdex-models.js";

import {
  PitchScriptParser,
} from "../src/parser.js";

function createModelToken(name: string) {
  const parser = new PitchScriptParser(
    createFCDexParserRegistry(),
  );

  return parser.createValue(name);
}

function createMockPrisma() {
  const club = {
    id: 1n,
    country: "Example FC",
    health: 1,
    attack: 1,
    rarity: 5,
    emojiId: 10n,
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

  return { prisma: { ball, special }, ball };
}

describe("FCDexHost", () => {
  it("uses Ball.country as the CLUB identifier", async () => {
    const { prisma, ball } = createMockPrisma();
    const host = createFCDexHost(prisma);

    const model = createModelToken("CLUB");

    await host.getModel(model, "Example FC");

    expect(ball.findUnique).toHaveBeenCalledWith({
      where: { country: "Example FC" },
    });
  });

  it("maps the DSL field WILD_CARD to Prisma wildCard", async () => {
    const { prisma } = createMockPrisma();
    const host = createFCDexHost(prisma);
    const model = createModelToken("CLUB");

    const record = await host.getModel(model, "Example FC");

    expect(host.getRecordValue(record, "wild_card")).toBe(
      "example.png",
    );
  });

  it("translates filter operators for Prisma", async () => {
    const { prisma, ball } = createMockPrisma();
    const host = createFCDexHost(prisma);
    const model = createModelToken("CLUB");

    await host.filterDelete(
      model,
      "rarity__gt",
      5,
    );

    expect(ball.deleteMany).toHaveBeenCalledWith({
      where: {
        rarity: { gt: 5 },
      },
    });
  });

  it("requires an explicit capacity_logic default for creation", async () => {
    const { prisma, ball } = createMockPrisma();
    const host = createFCDexHost(prisma);

    await expect(
      host.createModel(createModelToken("CLUB"), "New FC"),
    ).rejects.toThrow(
      'required field "capacity_logic" needs an explicit createDefaults value.',
    );

    expect(ball.create).not.toHaveBeenCalled();
  });

  it("accepts configured creation defaults", async () => {
    const { prisma, ball } = createMockPrisma();

    const host = createFCDexHost(prisma, {
      createDefaults: {
        Club: {
          capacity_logic: {},
        },
      },
    });

    await host.createModel(createModelToken("CLUB"), "New FC");

    expect(ball.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        country: "New FC",
        capacityLogic: {},
      }),
    });
  });
});
