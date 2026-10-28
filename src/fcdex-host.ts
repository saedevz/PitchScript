import { existsSync } from "node:fs";

import {
  fcdexModels,
  type FCDexModelReference,
} from "./fcdex-models.js";

import type {
  RuntimeModelDefinition,
  ModelFieldDefinition,
} from "./model-utils.js";

import { autocorrect, imagePath, isImage } from "./utils.js";

import type {
  PitchScriptValue,
} from "./types.js";

import type {
  PitchScriptFieldInfo,
  PitchScriptHost,
} from "./host.js";

import type {
  PitchScriptFilterHost,
} from "./commands/filter.js";

type PrismaArguments = Record<string, unknown>;

interface PrismaDelegate {
  findMany(args?: PrismaArguments): Promise<unknown[]>;
  findUnique(args: PrismaArguments): Promise<unknown | null>;
  create(args: PrismaArguments): Promise<unknown>;
  update(args: PrismaArguments): Promise<unknown>;
  delete(args: PrismaArguments): Promise<unknown>;
  updateMany(args: PrismaArguments): Promise<{ count: number }>;
  deleteMany(args: PrismaArguments): Promise<{ count: number }>;
}

export interface FCDexHostOptions {
  readonly createDefaults?: Partial<
    Record<"Club" | "Special", Readonly<Record<string, unknown>>>
  >;

  readonly saveAttachment?: (
    attachment: unknown,
  ) => Promise<string>;
}

function isRecord(
  value: unknown,
): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asDelegate(value: unknown): PrismaDelegate {
  if (!isRecord(value)) {
    throw new Error("Invalid Prisma model delegate.");
  }

  return value as unknown as PrismaDelegate;
}

function fieldDSLName(field: ModelFieldDefinition): string {
  return (field.dslName ?? field.name).toLowerCase();
}

function outputValue(value: unknown): string {
  if (value === null || value === undefined) return "None";
  if (value === true) return "True";
  if (value === false) return "False";
  if (typeof value === "bigint") return value.toString();

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "object") {
    return JSON.stringify(
      value,
      (_key, item: unknown) =>
        typeof item === "bigint" ? item.toString() : item,
    ) ?? "None";
  }

  return String(value);
}

export class FCDexHost
  implements PitchScriptHost, PitchScriptFilterHost
{
  private readonly prisma: Record<string, unknown>;

  private readonly recordModels = new WeakMap<
    object,
    RuntimeModelDefinition<FCDexModelReference>
  >();

  constructor(
    prisma: unknown,
    private readonly options: FCDexHostOptions = {},
  ) {
    if (!isRecord(prisma)) {
      throw new Error("A Prisma client instance is required.");
    }

    this.prisma = prisma;
  }

  private modelDefinition(
    model: PitchScriptValue | string,
  ): RuntimeModelDefinition<FCDexModelReference> {
    const name = typeof model === "string" ? model : model.name;

    const definition = fcdexModels.find(
      (entry) => entry.name.toLowerCase() === name.toLowerCase(),
    );

    if (!definition) {
      throw new Error(`Unsupported FCDex model "${name}".`);
    }

    return definition;
  }

  private delegate(
    model: RuntimeModelDefinition<FCDexModelReference>,
  ): PrismaDelegate {
    return asDelegate(this.prisma[model.value.delegate]);
  }

  private field(
    model: RuntimeModelDefinition<FCDexModelReference>,
    name: string,
  ): ModelFieldDefinition {
    const normalized = name.toLowerCase();

    const found = model.fields.find(
      (candidate) =>
        fieldDSLName(candidate) === normalized ||
        candidate.name.toLowerCase() === normalized,
    );

    if (!found) {
      throw new Error(
        `'${name}' is not a valid ${model.name} attribute`,
      );
    }

    return found;
  }

  private nativeField(
    model: RuntimeModelDefinition<FCDexModelReference>,
    name: string,
  ): string {
    return this.field(model, name).name;
  }

  private recordDefinition(
    record: unknown,
  ): RuntimeModelDefinition<FCDexModelReference> {
    if (!isRecord(record)) {
      throw new Error("Invalid model record.");
    }

    const definition = this.recordModels.get(record);

    if (!definition) {
      throw new Error(
        "The record was not loaded through the PitchScript host.",
      );
    }

    return definition;
  }

  private rememberRecord(
    record: unknown,
    model: RuntimeModelDefinition<FCDexModelReference>,
  ): unknown {
    if (isRecord(record)) {
      this.recordModels.set(record, model);
    }

    return record;
  }

  private whereClause(
    model: RuntimeModelDefinition<FCDexModelReference>,
    field: string,
    value: unknown,
  ): Record<string, unknown> {
    const [attribute, operator] = field.split("__");
    const nativeName = this.nativeField(model, attribute!);

    if (!operator) {
      return { [nativeName]: value };
    }

    const normalizedOperator = operator.toLowerCase();

    if (normalizedOperator === "isnull") {
      return {
        [nativeName]: value
          ? null
          : { not: null },
      };
    }

    const operators: Readonly<Record<string, string>> = {
      exact: "equals",
      gt: "gt",
      gte: "gte",
      lt: "lt",
      lte: "lte",
      contains: "contains",
      icontains: "contains",
      startswith: "startsWith",
      istartswith: "startsWith",
      endswith: "endsWith",
      iendswith: "endsWith",
      not: "not",
    };

    const prismaOperator = operators[normalizedOperator];

    if (!prismaOperator) {
      throw new Error(
        `Filter operator "${operator}" is not supported by the Prisma adapter.`,
      );
    }

    const caseInsensitive = [
      "icontains",
      "istartswith",
      "iendswith",
    ].includes(normalizedOperator);

    return {
      [nativeName]: {
        [prismaOperator]: value,
        ...(caseInsensitive ? { mode: "insensitive" } : {}),
      },
    };
  }

  async createModel(
    model: PitchScriptValue,
    identifier: string,
  ): Promise<void> {
    const definition = this.modelDefinition(model);

    const explicitDefaults =
      this.options.createDefaults?.[
        definition.name as "Club" | "Special"
      ] ?? {};

    const ignoredFields = new Set(["id", "short_name"]);
    const identifierFields = new Set([
      "country",
      "catch_names",
      "name",
    ]);

    const modelIdFields = new Set(
      fcdexModels.map(
        (registeredModel) =>
          `${registeredModel.name.toLowerCase()}_id`,
      ),
    );

    const data: Record<string, unknown> = {};

    for (const field of definition.fields) {
      const dslName = fieldDSLName(field);

      if (
        field.nullable ||
        ignoredFields.has(dslName) ||
        modelIdFields.has(dslName)
      ) {
        continue;
      }

      if (Object.hasOwn(explicitDefaults, dslName)) {
        data[field.name] = explicitDefaults[dslName];
        continue;
      }

      if (Object.hasOwn(explicitDefaults, field.name)) {
        data[field.name] = explicitDefaults[field.name];
        continue;
      }

      if (identifierFields.has(dslName)) {
        data[field.name] = identifier;
        continue;
      }

      switch (field.typeName) {
        case "BigIntField":
          data[field.name] = 100n ** 8n;
          break;

        case "IntField":
        case "FloatField":
          data[field.name] = 1;
          break;

        case "BooleanField":
          data[field.name] = true;
          break;

        case "CharField":
        case "TextField":
          data[field.name] = "1";
          break;

        case "BackwardFKRelation":
          break;

        case "JSONField":
          throw new Error(
            `Cannot create ${definition.name}: required field ` +
              `"${dslName}" needs an explicit createDefaults value.`,
          );

        default:
          throw new Error(
            `No default creation rule exists for ` +
              `${definition.name}.${dslName} (${field.typeName}).`,
          );
      }
    }

    await this.delegate(definition).create({ data });
  }

  async getModel(
    model: PitchScriptValue,
    identifier: string,
  ): Promise<unknown> {
    const definition = this.modelDefinition(model);
    const delegate = this.delegate(definition);
    const identifierField = model.extraData[0];

    if (typeof identifierField !== "string") {
      throw new Error(
        `Missing identifier field for ${definition.name}.`,
      );
    }

    const nativeIdentifier = this.nativeField(
      definition,
      identifierField,
    );

    const rows = await delegate.findMany({
      select: { [nativeIdentifier]: true },
    });

    const identifiers = rows
      .filter(isRecord)
      .map((row) => row[nativeIdentifier])
      .filter(
        (value): value is string =>
          typeof value === "string",
      );

    const corrected = autocorrect(
      String(identifier),
      identifiers,
    );

    const record = await delegate.findUnique({
      where: { [nativeIdentifier]: corrected },
    });

    if (!record) {
      throw new Error(
        `'${identifier}' does not exist.`,
      );
    }

    return this.rememberRecord(record, definition);
  }

  async deleteRecord(record: unknown): Promise<void> {
    const definition = this.recordDefinition(record);

    if (!isRecord(record) || record.id === undefined) {
      throw new Error("Cannot delete a record without an id.");
    }

    await this.delegate(definition).delete({
      where: { id: record.id },
    });
  }

  getFields(
    model: PitchScriptValue,
  ): readonly PitchScriptFieldInfo[] {
    const definition = this.modelDefinition(model);

    return definition.fields.map((field) => ({
      name: fieldDSLName(field),
      typeName: field.typeName,
      nullable: field.nullable,
      ...(field.maxLength === undefined
        ? {}
        : { maxLength: field.maxLength }),
    }));
  }

  hasAttribute(
    model: PitchScriptValue,
    attribute: string,
  ): boolean {
    try {
      this.field(this.modelDefinition(model), attribute);
      return true;
    } catch {
      return false;
    }
  }

  getRecordEntries(
    record: unknown,
  ): Iterable<readonly [string, unknown]> {
    if (!isRecord(record)) {
      throw new Error("Invalid model record.");
    }

    const definition = this.recordDefinition(record);

    return definition.fields.map(
      (field) =>
        [fieldDSLName(field), record[field.name]] as const,
    );
  }

  getRecordValue(
    record: unknown,
    attribute: string,
  ): unknown {
    const definition = this.recordDefinition(record);
    const nativeName = this.nativeField(definition, attribute);

    if (!isRecord(record)) {
      throw new Error("Invalid model record.");
    }

    return record[nativeName];
  }

  setRecordValue(
    record: unknown,
    attribute: string,
    value: unknown,
  ): void {
    const definition = this.recordDefinition(record);
    const nativeName = this.nativeField(definition, attribute);

    if (!isRecord(record)) {
      throw new Error("Invalid model record.");
    }

    record[nativeName] = value;
  }

  async saveRecord(
    record: unknown,
    updateFields: readonly string[],
  ): Promise<void> {
    const definition = this.recordDefinition(record);

    if (!isRecord(record) || record.id === undefined) {
      throw new Error("Cannot save a record without an id.");
    }

    const data: Record<string, unknown> = {};

    for (const field of updateFields) {
      const nativeName = this.nativeField(definition, field);
      data[nativeName] = record[nativeName];
    }

    await this.delegate(definition).update({
      where: { id: record.id },
      data,
    });
  }

  getPrimaryKey(record: unknown): unknown {
    if (!isRecord(record) || record.id === undefined) {
      throw new Error("Record has no primary key.");
    }

    return record.id;
  }

  async getRelatedIdentifiers(
    relation: unknown,
    identifierField: string,
  ): Promise<unknown> {
    const getIdentifier = (item: unknown): unknown => {
      if (!isRecord(item)) return item;

      const model = this.recordModels.get(item);

      if (!model) {
        return item[identifierField];
      }

      return item[this.nativeField(model, identifierField)];
    };

    if (Array.isArray(relation)) {
      return relation.map(getIdentifier);
    }

    return getIdentifier(relation);
  }

  async saveAttachment(attachment: unknown): Promise<string> {
    if (!this.options.saveAttachment) {
      throw new Error(
        "Attachment storage is not configured for the FCDex host.",
      );
    }

    return this.options.saveAttachment(attachment);
  }

  uploadedImageValue(relativePath: string): string {
    return existsSync("static")
      ? `/static/uploads/${relativePath}`
      : `/${relativePath}`;
  }

  isImage(path: string): boolean {
    return isImage(path);
  }

  imagePath(path: string): string {
    return imagePath(path);
  }

  formatValue(value: unknown): string {
    return outputValue(value);
  }

  filterUpdate(
    model: PitchScriptValue,
    field: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void> {
    const definition = this.modelDefinition(model);
    const [attribute] = field.split("__");
    const nativeField = this.nativeField(
      definition,
      attribute!,
    );

    return this.delegate(definition)
      .updateMany({
        where: this.whereClause(definition, field, oldValue),
        data: { [nativeField]: newValue },
      })
      .then(() => undefined);
  }

  filterDelete(
    model: PitchScriptValue,
    field: string,
    value: unknown,
  ): Promise<void> {
    const definition = this.modelDefinition(model);

    return this.delegate(definition)
      .deleteMany({
        where: this.whereClause(definition, field, value),
      })
      .then(() => undefined);
  }

  async filterValues(
    model: PitchScriptValue,
    field: string,
    value: unknown,
    identifierField: string,
  ): Promise<readonly string[]> {
    const definition = this.modelDefinition(model);

    const nativeIdentifier = this.nativeField(
      definition,
      identifierField,
    );

    const records = await this.delegate(definition).findMany({
      where: this.whereClause(definition, field, value),
      select: { [nativeIdentifier]: true },
    });

    return records
      .filter(isRecord)
      .map((record) => record[nativeIdentifier])
      .filter(
        (entry): entry is string | bigint | number =>
          typeof entry === "string" ||
          typeof entry === "bigint" ||
          typeof entry === "number",
      )
      .map(String);
  }
}

export function createFCDexHost(
  prisma: unknown,
  options: FCDexHostOptions = {},
): FCDexHost {
  return new FCDexHost(prisma, options);
}
