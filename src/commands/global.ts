import { ValueType, type PitchScriptValue } from "../types.js";
import type {
  PitchScriptCommandContext,
  PitchScriptHost,
} from "../host.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptSharedState,
} from "../dispatcher.js";

function valueOf(token: PitchScriptValue): unknown {
  return token.value;
}

function textOf(token: PitchScriptValue): string {
  return String(token.value ?? token.name);
}

function missingArgument(name: string): never {
  throw new TypeError(`Argument missing when calling '${name}'.`);
}

function ensureModel(model: PitchScriptValue | undefined): PitchScriptValue {
  if (!model || model.type !== ValueType.MODEL) {
    throw new TypeError("A model argument is required.");
  }
  return model;
}

export function createGlobalCommands(
  host: PitchScriptHost,
): PitchScriptCommandFactory<PitchScriptCommandContext> {
  return (_shared: PitchScriptSharedState) => ({
    methods: {
      async create(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        identifier?: PitchScriptValue,
      ) {
        const model = ensureModel(modelToken);
        if (!identifier) missingArgument("create");

        const identifierText = textOf(identifier);
        await host.createModel(model, identifierText);
        await context.send(
          `Created \`${identifierText}\` ${model.name.toLowerCase()}`,
        );
      },

      async delete(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        identifier?: PitchScriptValue,
      ) {
        const model = ensureModel(modelToken);
        if (!identifier) missingArgument("delete");

        const identifierText = textOf(identifier);
        const record = await host.getModel(model, identifierText);
        await host.deleteRecord(record);
        await context.send(
          `Deleted \`${identifierText}\` ${model.name.toLowerCase()}`,
        );
      },

      async update(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        identifier?: PitchScriptValue,
        attributeToken?: PitchScriptValue,
        valueToken?: PitchScriptValue,
      ) {
        const model = ensureModel(modelToken);
        if (!identifier || !attributeToken) missingArgument("update");

        const identifierText = textOf(identifier);
        const attributeName = attributeToken.name.toLowerCase();
        if (!host.hasAttribute(model, attributeName)) {
          throw new Error(
            `'${attributeName}' is not a valid ${model.name} attribute\n` +
              `Run \`ATTRIBUTES > ${model.name}\` to see a list of all attributes for that model`,
          );
        }

        const record = await host.getModel(model, identifierText);
        let fieldName = attributeName;
        let newValue: unknown = valueToken ? valueOf(valueToken) : null;

        if (
          valueToken === undefined &&
          (host.getFields(model).find((field) => field.name.toLowerCase() === attributeName)?.typeName === "CharField") &&
          host.getFields(model).find((field) => field.name.toLowerCase() === attributeName)?.maxLength === 200 &&
          (_shared.attachments.length > 0)
        ) {
          const attachment = _shared.attachments.shift();
          const savedPath = await host.saveAttachment(attachment);
          newValue = host.uploadedImageValue(savedPath);
        }

        if (attributeToken.type === ValueType.MODEL) {
          fieldName = `${attributeName}_id`;
          if (valueToken) {
            const related = await host.getModel(
              attributeToken,
              textOf(valueToken),
            );
            newValue = host.getPrimaryKey(related);
          }
        }

        host.setRecordValue(record, fieldName, newValue);
        await host.saveRecord(record, [fieldName]);

        const suffix = valueToken
          ? ` to \`${valueToken.name}\``
          : "";
        await context.send(
          `Updated \`${identifierText}'s\` ${attributeToken.name}${suffix}`,
        );
      },

      async view(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        identifier?: PitchScriptValue,
        attributeToken?: PitchScriptValue,
      ) {
        const model = ensureModel(modelToken);
        if (!identifier) missingArgument("view");

        const record = await host.getModel(model, textOf(identifier));

        if (!attributeToken) {
          const output: string[] = ["```"];
          const files: string[] = [];

          for (const [key, value] of host.getRecordEntries(record)) {
            output.push(`${key}: ${host.formatValue(value)}`);
            if (typeof value === "string" && host.isImage(value)) {
              files.push(host.imagePath(value));
            }
          }

          output.push("```");
          await context.send(output.join("\n"), files);
          return;
        }

        const attributeName = attributeToken.name.toLowerCase();
        if (!host.hasAttribute(model, attributeName)) {
          throw new Error(
            `'${attributeName}' is not a valid ${model.name} attribute\n` +
              `Run \`ATTRIBUTES > ${model.name}\` to see a list of all attributes for that model`,
          );
        }

        let result = host.getRecordValue(record, attributeName);

        if (attributeToken.type === ValueType.MODEL) {
          const identifierField = attributeToken.extraData[0];
          if (typeof identifierField === "string") {
            result = await host.getRelatedIdentifiers(result, identifierField);
          }
        }

        if (typeof result === "string" && host.isImage(result)) {
          await context.send(
            `\`\`\`${result}\`\`\``,
            [host.imagePath(result)],
          );
          return;
        }

        await context.send(`\`\`\`${host.formatValue(result)}\`\`\``);
      },

      async attributes(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        filterToken?: PitchScriptValue,
      ) {
        const model = ensureModel(modelToken);
        const filter = filterToken?.value;

        const fields = host
          .getFields(model)
          .filter((field) => field.typeName !== "BackwardFKRelation")
          .filter((field) => {
            if (filter === undefined || filter === null) return true;
            const normalized = String(filter).toLowerCase();
            if (normalized === "null") return field.nullable;
            if (normalized === "valid") return !field.nullable;
            return true;
          })
          .map((field) => `- ${field.name.toUpperCase()}`);

        fields.unshift(`${model.name.toUpperCase()} ATTRIBUTES:`);
        await context.sendList(fields);
      },
    },
  });
}
