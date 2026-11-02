import { ValueType, type PitchScriptValue } from "../types.js";
import type { PitchScriptCommandContext } from "../host.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptSharedState,
} from "../dispatcher.js";

export interface PitchScriptFilterHost {
  hasAttribute(model: PitchScriptValue, attribute: string): boolean;
  getModel(model: PitchScriptValue, identifier: string): Promise<unknown>;
  getPrimaryKey(record: unknown): unknown;
  filterUpdate(
    model: PitchScriptValue,
    field: string,
    oldValue: unknown,
    newValue: unknown,
  ): Promise<void>;
  filterDelete(
    model: PitchScriptValue,
    field: string,
    value: unknown,
  ): Promise<void>;
  filterValues(
    model: PitchScriptValue,
    field: string,
    value: unknown,
    identifierField: string,
  ): Promise<readonly string[]>;
}

function required<T>(value: T | undefined, method: string): T {
  if (value === undefined) {
    throw new TypeError(`Argument missing when calling '${method}'.`);
  }
  return value;
}

function rawValue(value: PitchScriptValue): unknown {
  return value.value;
}

function asText(value: PitchScriptValue): string {
  return String(value.value ?? value.name);
}

function modelIdentifierField(model: PitchScriptValue): string {
  const field = model.extraData[0];
  if (typeof field !== "string") {
    throw new Error(`Missing identifier field for ${model.name}.`);
  }
  return field;
}

function filterField(
  host: PitchScriptFilterHost,
  model: PitchScriptValue,
  attribute: PitchScriptValue,
  operator?: PitchScriptValue,
): string {
  const name = attribute.name.toLowerCase();
  if (!host.hasAttribute(model, name)) {
    throw new Error(`'${name}' is not a valid ${model.name} attribute`);
  }
  return operator
    ? `${name}__${operator.name.toLowerCase()}`
    : name;
}

async function filterValue(
  host: PitchScriptFilterHost,
  attribute: PitchScriptValue,
  value: PitchScriptValue,
): Promise<unknown> {
  if (attribute.type === ValueType.MODEL) {
    const related = await host.getModel(attribute, asText(value));
    return host.getPrimaryKey(related);
  }
  return rawValue(value);
}

export function createFilterCommands(
  host: PitchScriptFilterHost,
): PitchScriptCommandFactory<PitchScriptCommandContext> {
  return (_shared: PitchScriptSharedState) => ({
    methods: {
      async update(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        attributeToken?: PitchScriptValue,
        oldValueToken?: PitchScriptValue,
        newValueToken?: PitchScriptValue,
        operatorToken?: PitchScriptValue,
      ) {
        const model = required(modelToken, "update");
        const attribute = required(attributeToken, "update");
        const oldValue = required(oldValueToken, "update");
        const newValue = required(newValueToken, "update");
        const field = filterField(host, model, attribute, operatorToken);
        await host.filterUpdate(
          model,
          field,
          await filterValue(host, attribute, oldValue),
          await filterValue(host, attribute, newValue),
        );
        await context.send(
          `Updated all \`${model.name}\` instances from a \`${attribute.name}\` value of ` +
            `\`${oldValue.name}\` to \`${newValue.name}\``,
        );
      },

      async delete(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        attributeToken?: PitchScriptValue,
        valueToken?: PitchScriptValue,
        operatorToken?: PitchScriptValue,
      ) {
        const model = required(modelToken, "delete");
        const attribute = required(attributeToken, "delete");
        const value = required(valueToken, "delete");
        const field = filterField(host, model, attribute, operatorToken);
        await host.filterDelete(
          model,
          field,
          await filterValue(host, attribute, value),
        );
        await context.send(
          `Deleted all \`${model.name}\` instances with a \`${attribute.name}\` value of \`${value.name}\``,
        );
      },

      async view(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        attributeToken?: PitchScriptValue,
        valueToken?: PitchScriptValue,
        operatorToken?: PitchScriptValue,
      ) {
        const model = required(modelToken, "view");
        const attribute = required(attributeToken, "view");
        const value = required(valueToken, "view");
        const field = filterField(host, model, attribute, operatorToken);
        const values = await host.filterValues(
          model,
          field,
          await filterValue(host, attribute, value),
          modelIdentifierField(model),
        );

        if (values.length === 0) {
          await context.send(
            `No ${model.name}s found with a \`${attribute.name}\` value of \`${value.name}\``,
          );
          return;
        }

        await context.sendList(values);
      },
    },
  });
}
