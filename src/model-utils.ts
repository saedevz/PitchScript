import { autocorrect, pascalCase } from "./utils.js";
import type { ModelDefinition } from "./types.js";

export interface ModelFieldDefinition {
  /** Native model property name. */
  readonly name: string;

  /** Original DSL field name, when it differs from the native name. */
  readonly dslName?: string;

  /** Original field type name, such as ForeignKeyFieldInstance. */
  readonly typeName: string;

  readonly nullable: boolean;
  readonly maxLength?: number;

  /** Related model name for foreign-key fields. */
  readonly relatedModelName?: string;

  /** Native property holding the related record's primary key. */
  readonly foreignKeyField?: string;
}

export interface RuntimeModelDefinition<TModel = unknown>
  extends ModelDefinition<TModel> {
  readonly fields: readonly ModelFieldDefinition[];
}

export interface ModelUtilityGateway<TModel = unknown, TRecord = unknown> {
  /**
   * Equivalent to values_list(identifierField, flat=True).
   */
  valuesList(
    model: TModel,
    identifierField: string,
  ): Promise<readonly string[]>;

  /**
   * Equivalent to filter(**filters).
   */
  filter(
    model: TModel,
    filters: Readonly<Record<string, unknown>>,
  ): Promise<readonly TRecord[]>;

  /**
   * Equivalent to model.create(**values).
   */
  create(
    model: TModel,
    values: Readonly<Record<string, unknown>>,
  ): Promise<void>;

  /**
   * Equivalent to model.first() for a foreign-key default.
   */
  first(model: TModel): Promise<TRecord | null>;

  primaryKey(record: TRecord): unknown;
}

/**
 * Finds registered model metadata by name, case-insensitively.
 */
export function findRuntimeModel<TModel>(
  name: string,
  models: readonly RuntimeModelDefinition<TModel>[],
): RuntimeModelDefinition<TModel> | undefined {
  const normalizedName = pascalCase(name).toLowerCase();

  return models.find(
    (model) => model.name.toLowerCase() === normalizedName,
  );
}

/**
 * Equivalent to Utils.fetch_fields().
 */
export function fetchFields<TModel>(
  model: RuntimeModelDefinition<TModel>,
  fieldFilter?: (
    name: string,
    field: ModelFieldDefinition,
  ) => boolean,
): string[] {
  return model.fields
    .filter((field) =>
      fieldFilter
        ? fieldFilter(field.name, field)
        : true,
    )
    .map((field) => field.name);
}

/**
 * Equivalent to Utils.get_field().
 *
 * Use the original DSL field name when a native property has
 * a different spelling.
 */
export function getField<TModel>(
  model: RuntimeModelDefinition<TModel>,
  fieldName: string,
): ModelFieldDefinition | undefined {
  return model.fields.find(
    (field) => (field.dslName ?? field.name) === fieldName,
  );
}

/**
 * Equivalent to Utils.get_model().
 *
 * The original suggests close matches but requires the resolved
 * identifier to be an exact match.
 */
export async function getModel<TModel, TRecord>(
  model: RuntimeModelDefinition<TModel>,
  identifier: string,
  gateway: ModelUtilityGateway<TModel, TRecord>,
): Promise<TRecord> {
  const identifiers = await gateway.valuesList(
    model.value,
    model.identifierField,
  );

  const correctedIdentifier = autocorrect(
    String(identifier),
    identifiers,
  );

  const records = await gateway.filter(
    model.value,
    {
      [model.identifierField]: correctedIdentifier,
    },
  );

  const record = records[0];

  if (record === undefined) {
    throw new Error(`'${identifier}' does not exist.`);
  }

  return record;
}

/**
 * Equivalent to Utils.create_model().
 *
 * With fieldsOnly=true, returns the default field values without
 * creating a record.
 */
export async function createModel<TModel, TRecord>(
  model: RuntimeModelDefinition<TModel>,
  identifier: string,
  models: readonly RuntimeModelDefinition<TModel>[],
  gateway: ModelUtilityGateway<TModel, TRecord>,
  fieldsOnly = false,
): Promise<Record<string, unknown> | void> {
  const values: Record<string, unknown> = {};

  const identifierFields = new Set([
    "country",
    "catch_names",
    "name",
  ]);

  const ignoredFields = new Set([
    "id",
    "short_name",
  ]);

  const modelIdFields = new Set(
    models.map(
      (registeredModel) =>
        `${registeredModel.name.toLowerCase()}_id`,
    ),
  );

  for (const field of model.fields) {
    const dslName = field.dslName ?? field.name;

    if (
      field.nullable ||
      ignoredFields.has(dslName) ||
      modelIdFields.has(dslName)
    ) {
      continue;
    }

    if (identifierFields.has(dslName)) {
      values[field.name] = String(identifier);
      continue;
    }

    switch (field.typeName) {
      case "ForeignKeyFieldInstance": {
        const relatedModelName =
          field.relatedModelName ?? pascalCase(field.name);

        const relatedModel = findRuntimeModel(
          relatedModelName,
          models,
        );

        if (!relatedModel) {
          throw new Error(
            `Could not find default ${relatedModelName}`,
          );
        }

        const instance = await gateway.first(
          relatedModel.value,
        );

        if (instance === null) {
          throw new Error(
            `Could not find default ${relatedModelName}`,
          );
        }

        const foreignKeyField =
          field.foreignKeyField ?? `${field.name}_id`;

        values[foreignKeyField] =
          gateway.primaryKey(instance);

        break;
      }

      case "BigIntField":
        values[field.name] = 100 ** 8;
        break;

      case "BackwardFKRelation":
      case "JSONField":
        break;

      default:
        values[field.name] = 1;
        break;
    }
  }

  if (fieldsOnly) {
    return values;
  }

  await gateway.create(model.value, values);
}
