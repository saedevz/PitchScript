import type { PitchScriptRegistry } from "./types.js";
import type { RuntimeModelDefinition } from "./model-utils.js";

export interface FCDexModelReference {
  readonly delegate: "ball" | "special";
  readonly prismaModel: "Ball" | "Special";
}

const clubModel: FCDexModelReference = {
  delegate: "ball",
  prismaModel: "Ball",
};

const specialModel: FCDexModelReference = {
  delegate: "special",
  prismaModel: "Special",
};

export const fcdexModels: readonly RuntimeModelDefinition<FCDexModelReference>[] = [
  {
    name: "Club",
    identifierField: "country",
    value: clubModel,
    fields: [
      { name: "id", typeName: "BigIntField", nullable: false },
      { name: "country", typeName: "CharField", nullable: false, maxLength: 48 },
      { name: "health", typeName: "IntField", nullable: false },
      { name: "attack", typeName: "IntField", nullable: false },
      { name: "rarity", typeName: "FloatField", nullable: false },
      { name: "emojiId", dslName: "emoji_id", typeName: "BigIntField", nullable: false },
      { name: "wildCard", dslName: "wild_card", typeName: "CharField", nullable: false, maxLength: 200 },
      { name: "collectionCard", dslName: "collection_card", typeName: "CharField", nullable: false, maxLength: 200 },
      { name: "credits", typeName: "CharField", nullable: false, maxLength: 64 },
      { name: "capacityName", dslName: "capacity_name", typeName: "CharField", nullable: false, maxLength: 64 },
      { name: "capacityDescription", dslName: "capacity_description", typeName: "CharField", nullable: false, maxLength: 256 },
      { name: "capacityLogic", dslName: "capacity_logic", typeName: "JSONField", nullable: false },
      { name: "enabled", typeName: "BooleanField", nullable: false },
      { name: "shortName", dslName: "short_name", typeName: "CharField", nullable: true, maxLength: 24 },
      { name: "catchNames", dslName: "catch_names", typeName: "TextField", nullable: true },
      { name: "tradeable", typeName: "BooleanField", nullable: false },
      { name: "createdAt", dslName: "created_at", typeName: "DatetimeField", nullable: true },
      { name: "translations", typeName: "TextField", nullable: true },
      { name: "economyId", dslName: "economy_id", typeName: "BigIntField", nullable: true },
      { name: "regimeId", dslName: "regime_id", typeName: "BigIntField", nullable: false },
    ],
  },
  {
    name: "Special",
    identifierField: "name",
    value: specialModel,
    fields: [
      { name: "id", typeName: "BigIntField", nullable: false },
      { name: "name", typeName: "CharField", nullable: false, maxLength: 64 },
      { name: "catchPhrase", dslName: "catch_phrase", typeName: "CharField", nullable: true, maxLength: 128 },
      { name: "startDate", dslName: "start_date", typeName: "DatetimeField", nullable: true },
      { name: "endDate", dslName: "end_date", typeName: "DatetimeField", nullable: true },
      { name: "rarity", typeName: "FloatField", nullable: false },
      { name: "emoji", typeName: "CharField", nullable: true, maxLength: 20 },
      { name: "background", typeName: "CharField", nullable: true },
      { name: "tradeable", typeName: "BooleanField", nullable: false },
      { name: "hidden", typeName: "BooleanField", nullable: false },
      { name: "credits", typeName: "TextField", nullable: true },
    ],
  },
];

export function createFCDexParserRegistry(): PitchScriptRegistry {
  return {
    globalMethods: [
      "create",
      "delete",
      "update",
      "view",
      "attributes",
    ],
    commandClasses: [
      "Filter",
      "Eval",
      "File",
      "Template",
    ],
    models: fcdexModels,
  };
}
