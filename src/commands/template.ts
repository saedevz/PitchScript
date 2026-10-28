import type {
  PitchScriptCommandFactory,
} from "../dispatcher.js";
import type {
  PitchScriptCommandContext,
} from "../host.js";
import type { PitchScriptValue } from "../types.js";

export const createTemplateCommands:
  PitchScriptCommandFactory<PitchScriptCommandContext> =
  () => ({
    methods: {
      create: async (
        ctx,
        model: PitchScriptValue,
        argument?: PitchScriptValue,
      ) => {
        if (!model) {
          throw new Error(
            "Argument missing when calling 'create'.",
          );
        }

        if (model.name.toLowerCase() !== "club") {
          return;
        }

        const identifier = argument?.name ?? "...";

        const templateCommands = [
          `CREATE > CLUB > ${identifier}`,
          `UPDATE > CLUB > ${identifier} > HEALTH > ...`,
          `UPDATE > CLUB > ${identifier} > ATTACK > ...`,
          `UPDATE > CLUB > ${identifier} > RARITY > ...`,
          `UPDATE > CLUB > ${identifier} > EMOJI_ID > ...`,
          `UPDATE > CLUB > ${identifier} > WILD_CARD > ...`,
          `UPDATE > CLUB > ${identifier} > COLLECTION_CARD > ...`,
          `UPDATE > CLUB > ${identifier} > CREDITS > ...`,
          `UPDATE > CLUB > ${identifier} > CAPACITY_NAME > ...`,
          `UPDATE > CLUB > ${identifier} > CAPACITY_DESCRIPTION > ...`,
          `UPDATE > CLUB > ${identifier} > REGIME_ID > ...`,
        ];

        await ctx.send(
          `\`\`\`sql\n${templateCommands.join("\n")}\n\`\`\``,
        );
      },
    },
  });
