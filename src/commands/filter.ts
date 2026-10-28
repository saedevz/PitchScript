import { ValueType, type PitchScriptValue } from "../types.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptCommandInstance,
} from "../dispatcher.js";
import type { PitchScriptCommandContext } from "../host.js";
import type { PitchScriptHost } from "../host.js";

export interface PitchScriptFilterHost
  extends Pick<PitchScriptHost, "hasAttribute" | "getModel"> {
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

export function createFilterCommands(
  host: PitchScriptFilterHost,
): PitchScriptCommandFactory<PitchScriptCommandContext> {
  return (shared): PitchScriptCommandInstance<PitchScriptCommandContext> => {
    void shared;

    function validateAttribute(
      model: PitchScriptValue,
      attribute: PitchScriptValue,
    ): string {
      const attributeName = attribute.name.toLowerCase();

      if (
        model.value !== null &&
        !host.hasAttribute(model, attributeName)
      ) {
        throw new Error(
          `'${attributeName}' is not a valid ${model.name} attribute\n` +
            `Run \`ATTRIBUTES > ${model.name}\` to see a list of ` +
            "all attributes for that model",
        );
      }

      return attributeName;
    }

    async function resolveValue(
      attribute: PitchScriptValue,
      value: PitchScriptValue,
    ): Promise<unknown> {
      if (attribute.type === ValueType.MODEL) {
        return host.getModel(attribute, String(value.value));
      }

      return value.value;
    }

    function queryField(
      attributeName: string,
      operator?: PitchScriptValue,
    ): string {
      if (operator === undefined) {
        return attributeName;
      }

      return `${attributeName}__${operator.name.toLowerCase()}`;
    }

    return {
      methods: {
        update: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0];
          const attribute = args[1];
          const oldValue = args[2];
          const newValue = args[3];
          const operator = args[4];

          if (!model || !attribute || !oldValue || !newValue) {
            throw new Error(
              "Argument missing when calling 'update'.",
            );
          }

          const attributeName = validateAttribute(model, attribute);
          const field = queryField(attributeName, operator);

          const resolvedOldValue = await resolveValue(
            attribute,
            oldValue,
          );

          const resolvedNewValue = await resolveValue(
            attribute,
            newValue,
          );

          await host.filterUpdate(
            model,
            field,
            resolvedOldValue,
            resolvedNewValue,
          );

          await ctx.send(
            `Updated all \`${model.name}\` instances from a ` +
              `\`${attribute.name}\` value of \`${oldValue.name}\` ` +
              `to \`${newValue.name}\``,
          );
        },

        delete: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0];
          const attribute = args[1];
          const value = args[2];
          const operator = args[3];

          if (!model || !attribute || !value) {
            throw new Error(
              "Argument missing when calling 'delete'.",
            );
          }

          const attributeName = validateAttribute(model, attribute);
          const field = queryField(attributeName, operator);

          const resolvedValue = await resolveValue(
            attribute,
            value,
          );

          await host.filterDelete(
            model,
            field,
            resolvedValue,
          );

          await ctx.send(
            `Deleted all \`${model.name}\` instances with a ` +
              `\`${attribute.name}\` value of \`${value.name}\``,
          );
        },

        view: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0];
          const attribute = args[1];
          const value = args[2];
          const operator = args[3];

          if (!model || !attribute || !value) {
            throw new Error(
              "Argument missing when calling 'view'.",
            );
          }

          const attributeName = validateAttribute(model, attribute);
          const field = queryField(attributeName, operator);

          const resolvedValue = await resolveValue(
            attribute,
            value,
          );

          const identifierField = model.extraData[0];

          if (typeof identifierField !== "string") {
            throw new Error(
              `Could not resolve the identifier field for ${model.name}.`,
            );
          }

          const instances = await host.filterValues(
            model,
            field,
            resolvedValue,
            identifierField,
          );

          if (instances.length === 0) {
            await ctx.send(
              `No ${model.name}s found with a ` +
                `\`${attribute.name}\` value of \`${value.name}\``,
            );
            return;
          }

          await ctx.sendList(instances);
        },
      },
    };
  };
}
