import type { PitchScriptValue } from "../types.js";
import type { PitchScriptCommandContext } from "../host.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptSharedState,
} from "../dispatcher.js";

export const createTemplateCommands: PitchScriptCommandFactory<PitchScriptCommandContext> =
  (_shared: PitchScriptSharedState) => ({
    methods: {
      async create(
        context: PitchScriptCommandContext,
        modelToken?: PitchScriptValue,
        argumentToken?: PitchScriptValue,
      ) {
        if (!modelToken) {
          throw new TypeError("Argument missing when calling 'create'.");
        }

        // FCDex's CLUB DSL model is the BallsDex Ball model used by
        // the original DexScript template.
        if (modelToken.name.toLowerCase() !== "club" && modelToken.name.toLowerCase() !== "ball") {
          throw new Error(`No creation template is defined for '${modelToken.name}'.`);
        }

        const argument = argumentToken?.name ?? "...";
        const lines = [
          `CREATE > CLUB > ${argument}`,
          `UPDATE > CLUB > ${argument} > HEALTH > ...`,
          `UPDATE > CLUB > ${argument} > ATTACK > ...`,
          `UPDATE > CLUB > ${argument} > RARITY > ...`,
          `UPDATE > CLUB > ${argument} > EMOJI_ID > ...`,
          `UPDATE > CLUB > ${argument} > WILD_CARD > ...`,
          `UPDATE > CLUB > ${argument} > COLLECTION_CARD > ...`,
          `UPDATE > CLUB > ${argument} > CREDITS > ...`,
          `UPDATE > CLUB > ${argument} > CAPACITY_NAME > ...`,
          `UPDATE > CLUB > ${argument} > CAPACITY_DESCRIPTION > ...`,
          `UPDATE > CLUB > ${argument} > CAPACITY_LOGIC > ...`,
        ];

        await context.send(`\`\`\`sql\n${lines.join("\n")}\n\`\`\``);
      },
    },
  });
