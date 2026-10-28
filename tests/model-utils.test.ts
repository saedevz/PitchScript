import { describe, expect, it, vi } from "vitest";

import {
  createModel,
  fetchFields,
  findRuntimeModel,
  getField,
  getModel,
  type ModelUtilityGateway,
  type RuntimeModelDefinition,
} from "../src/model-utils.js";

interface TestRecord {
  id: number;
  name: string;
  rarity?: number;
}

const clubRecord: TestRecord = {
  id: 1,
  name: "Example FC",
  rarity: 5,
};

const clubModel: RuntimeModelDefinition<{ name: string }> = {
  name: "Club",
  identifierField: "name",
  value: { name: "Club" },
  fields: [
    {
      name: "id",
      typeName: "BigIntField",
      nullable: false,
    },
    {
      name: "name",
      typeName: "CharField",
      nullable: false,
    },
    {
      name: "rarity",
      typeName: "FloatField",
      nullable: false,
    },
    {
      name: "shortName",
      dslName: "short_name",
      typeName: "CharField",
      nullable: true,
    },
  ],
};

function createGateway() {
  const gateway: ModelUtilityGateway<
    { name: string },
    TestRecord
  > = {
    valuesList: vi.fn(async () => [
      "Example FC",
      "Another FC",
    ]),

    filter: vi.fn(async () => [clubRecord]),

    create: vi.fn(async () => {}),

    first: vi.fn(async () => null),

    primaryKey: (record) => record.id,
  };

  return gateway;
}

describe("model utilities", () => {
  it("resolves a registered model name", () => {
    expect(
      findRuntimeModel("club", [clubModel]),
    ).toBe(clubModel);
  });

  it("returns undefined for an unknown model", () => {
    expect(
      findRuntimeModel("unknown", [clubModel]),
    ).toBeUndefined();
  });

  it("lists fields", () => {
    expect(fetchFields(clubModel)).toEqual([
      "id",
      "name",
      "rarity",
      "shortName",
    ]);
  });

  it("filters fields", () => {
    expect(
      fetchFields(
        clubModel,
        (_name, field) => !field.nullable,
      ),
    ).toEqual([
      "id",
      "name",
      "rarity",
    ]);
  });

  it("resolves a field by its DSL name", () => {
    expect(
      getField(clubModel, "short_name")?.name,
    ).toBe("shortName");
  });

  it("retrieves a model using its identifier", async () => {
    const gateway = createGateway();

    await expect(
      getModel(clubModel, "Example FC", gateway),
    ).resolves.toEqual(clubRecord);

    expect(gateway.valuesList).toHaveBeenCalledWith(
      clubModel.value,
      "name",
    );

    expect(gateway.filter).toHaveBeenCalledWith(
      clubModel.value,
      { name: "Example FC" },
    );
  });

  it("rejects an unknown identifier with a suggestion", async () => {
    const gateway = createGateway();

    await expect(
      getModel(clubModel, "Exampl FC", gateway),
    ).rejects.toThrow("Did you mean 'Example FC'?");
  });

  it("creates only the default field values when fieldsOnly is true", async () => {
    const gateway = createGateway();

    const result = await createModel(
      clubModel,
      "Example FC",
      [clubModel],
      gateway,
      true,
    );

    expect(result).toEqual({
      name: "Example FC",
      rarity: 1,
    });

    expect(gateway.create).not.toHaveBeenCalled();
  });

  it("creates the model using the default field values", async () => {
    const gateway = createGateway();

    await createModel(
      clubModel,
      "Example FC",
      [clubModel],
      gateway,
    );

    expect(gateway.create).toHaveBeenCalledWith(
      clubModel.value,
      {
        name: "Example FC",
        rarity: 1,
      },
    );
  });
});
