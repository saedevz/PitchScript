import { ValueType, type PitchScriptValue } from "../types.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptCommandInstance,
} from "../dispatcher.js";
import type {
  PitchScriptCommandContext,
  PitchScriptHost,
} from "../host.js";

export function createGlobalCommands(
  host: PitchScriptHost,
): PitchScriptCommandFactory<PitchScriptCommandContext> {
  return (shared): PitchScriptCommandInstance<PitchScriptCommandContext> => {
    function attributeError(
      model: PitchScriptValue,
      attribute: string,
    ): void {
      if (
        model.value === null ||
        host.hasAttribute(model, attribute)
      ) {
        return;
      }

      throw new Error(
        `'${attribute}' is not a valid ${model.name} attribute\n` +
          `Run \`ATTRIBUTES > ${model.name}\` to see a list of ` +
          `all attributes for that model`,
      );
    }

    return {
      methods: {
        create: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0]!;
          const identifier = args[1]!;

          await host.createModel(model, identifier.name);

          await ctx.send(
            `Created \`${identifier.name}\` ${model.name.toLowerCase()}`,
          );
        },

        delete: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0]!;
          const identifier = args[1]!;

          const record = await host.getModel(
            model,
            identifier.name,
          );

          await host.deleteRecord(record);

          await ctx.send(
            `Deleted \`${identifier.name}\` ${model.name.toLowerCase()}`,
          );
        },

        update: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0]!;
          const identifier = args[1]!;
          const attribute = args[2]!;
          const value = args[3];

          let attributeName = attribute.name.toLowerCase();
          let newValue: unknown =
            value === undefined ? null : value.value;

          const record = await host.getModel(
            model,
            identifier.name,
          );

          attributeError(model, attributeName);

          const imageFields = host
            .getFields(model)
            .filter(
              (field) =>
                field.typeName === "CharField" &&
                field.maxLength === 200,
            )
            .map((field) => field.name);

          if (
            value === undefined &&
            shared.attachments.length > 0 &&
            imageFields.includes(attributeName)
          ) {
            const attachment = shared.attachments.shift();

            if (attachment !== undefined) {
              const savedPath =
                await host.saveAttachment(attachment);

              newValue = host.uploadedImageValue(savedPath);
            }
          }

          if (attribute.type === ValueType.MODEL) {
            attributeName = `${attribute.name.toLowerCase()}_id`;

            const relatedRecord = await host.getModel(
              attribute,
              value!.name,
            );

            newValue = host.getPrimaryKey(relatedRecord);
          }

          host.setRecordValue(
            record,
            attributeName,
            newValue,
          );

          await host.saveRecord(record, [attributeName]);

          const suffix =
            value === undefined
              ? ""
              : ` to \`${value.name}\``;

          await ctx.send(
            `Updated \`${identifier.name}'s\` ${attribute.name}${suffix}`,
          );
        },

        view: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0]!;
          const identifier = args[1]!;
          const attribute = args[2];

          const record = await host.getModel(
            model,
            identifier.name,
          );

          if (attribute === undefined) {
            const lines = ["```"];
            const files: string[] = [];

            for (const [key, value] of host.getRecordEntries(record)) {
              if (key.startsWith("_")) {
                continue;
              }

              lines.push(
                `${key}: ${host.formatValue(value)}`,
              );

              if (
                typeof value === "string" &&
                host.isImage(value)
              ) {
                files.push(host.imagePath(value));
              }
            }

            lines.push("```");

            await ctx.send(lines.join("\n"), files);
            return;
          }

          const attributeName = attribute.name.toLowerCase();

          attributeError(model, attributeName);

          let newAttribute = host.getRecordValue(
            record,
            attributeName,
          );

          if (
            typeof newAttribute === "string" &&
            host.isImage(newAttribute)
          ) {
            await ctx.send(
              `\`\`\`${newAttribute}\`\`\``,
              [host.imagePath(newAttribute)],
            );
            return;
          }

          if (attribute.type === ValueType.MODEL) {
            newAttribute = await host.getRelatedIdentifiers(
              newAttribute,
              attribute.extraData[0]!,
            );
          }

          await ctx.send(
            `\`\`\`${host.formatValue(newAttribute)}\`\`\``,
          );
        },

        attributes: async (ctx, ...args: PitchScriptValue[]) => {
          const model = args[0]!;
          const filter = args[1];

          const fields = host.getFields(model)
            .filter((field) => {
              if (field.typeName === "BackwardFKRelation") {
                return false;
              }

              if (filter === undefined) {
                return true;
              }

              switch (String(filter.value).toLowerCase()) {
                case "null":
                  return field.nullable;

                case "valid":
                  return !field.nullable;

                default:
                  return true;
              }
            })
            .map((field) => `- ${field.name.toUpperCase()}`);

          fields.unshift(`${model.name.toUpperCase()} ATTRIBUTES:\n`);

          await ctx.sendList(fields);
        },
      },
    };
  };
}
