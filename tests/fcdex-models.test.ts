import { describe, expect, it } from "vitest";

import { PitchScriptParser } from "../src/parser.js";
import {
  createFCDexParserRegistry,
  fcdexModels,
} from "../src/fcdex-models.js";

describe("FCDex model registry", () => {
  it("maps CLUB to the Ball Prisma model", () => {
    const club = fcdexModels.find(
      (model) => model.name === "Club",
    );

    expect(club?.identifierField).toBe("country");
    expect(club?.value).toEqual({
      delegate: "ball",
      prismaModel: "Ball",
    });
  });

  it("maps SPECIAL to the Special Prisma model", () => {
    const special = fcdexModels.find(
      (model) => model.name === "Special",
    );

    expect(special?.identifierField).toBe("name");
    expect(special?.value).toEqual({
      delegate: "special",
      prismaModel: "Special",
    });
  });

  it("exposes the original command families", () => {
    const registry = createFCDexParserRegistry();

    expect(registry.globalMethods).toEqual([
      "create",
      "delete",
      "update",
      "view",
      "attributes",
    ]);

    expect(registry.commandClasses).toEqual([
      "Filter",
      "Eval",
      "File",
      "Template",
    ]);
  });

  it("recognizes CLUB and its rarity query", () => {
    const parser = new PitchScriptParser(
      createFCDexParserRegistry(),
    );

    const parsed = parser.parse(
      "VIEW > CLUB > Example FC > RARITY",
    );

    expect(parsed[0]?.[1]).toMatchObject({
      name: "Club",
      extraData: ["country"],
    });

    expect(parsed[0]?.[3]?.name).toBe("RARITY");
  });

  it("does not register unavailable Prisma models", () => {
    const registry = createFCDexParserRegistry();
    const registeredNames = registry.models.map(
      (model) => model.name,
    );

    expect(registeredNames).not.toContain("Regime");
    expect(registeredNames).not.toContain("Economy");
  });

  it("includes the required regimeId field", () => {
    const club = fcdexModels.find(
      (model) => model.name === "Club",
    );

    const field = club?.fields.find(
      (candidate) => candidate.dslName === "regime_id",
    );

    expect(field).toMatchObject({
      name: "regimeId",
      typeName: "BigIntField",
      nullable: false,
    });
  });
});
