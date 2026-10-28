import {
  access,
  mkdir,
  readFile,
  readdir,
  unlink,
  writeFile,
} from "node:fs/promises";
import { resolve } from "node:path";

import type {
  PitchScriptCommandFactory,
} from "../dispatcher.js";
import type {
  PitchScriptCommandContext,
} from "../host.js";
import { removeCodeMarkdown } from "../runner.js";

const EVAL_DIRECTORY = resolve(
  process.cwd(),
  "eval_presets",
);

const EVAL_TIMEOUT_MS = 20_000;
const EVAL_NAME_LIMIT = 100;

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export const createEvalCommands:
  PitchScriptCommandFactory<PitchScriptCommandContext> =
  () => ({
    loaded: async () => {
      await mkdir(EVAL_DIRECTORY, { recursive: true });
    },

    methods: {
      save: async (ctx, name) => {
        if (!name) {
          throw new Error(
            "Argument missing when calling 'save'.",
          );
        }

        if (name.name.length > EVAL_NAME_LIMIT) {
          throw new Error(
            `\`${name.name}\` exceeds the ${EVAL_NAME_LIMIT}-character limit ` +
              `(${name.name.length} > ${EVAL_NAME_LIMIT})`,
          );
        }

        const path = resolve(
          EVAL_DIRECTORY,
          `${name.name}.pitchscript`,
        );

        if (await fileExists(path)) {
          throw new Error(`\`${name.name}\` already exists.`);
        }

        if (!ctx.waitForMessage) {
          throw new Error(
            "The host must implement waitForMessage to save eval presets.",
          );
        }

        await ctx.send(
          "Please send the eval command below...",
        );

        const message = await ctx.waitForMessage(
          EVAL_TIMEOUT_MS,
        );

        if (message === null) {
          await ctx.send(
            "Eval preset saving has timed out.",
          );
          return;
        }

        await writeFile(
          path,
          removeCodeMarkdown(message.content),
          "utf8",
        );

        await ctx.send(
          `\`${name.name}\` eval preset has been saved!`,
        );
      },

      remove: async (ctx, name) => {
        if (!name) {
          throw new Error(
            "Argument missing when calling 'remove'.",
          );
        }

        const path = resolve(
          EVAL_DIRECTORY,
          `${name.name}.pitchscript`,
        );

        if (!(await fileExists(path))) {
          throw new Error(
            `\`${name.name}\` does not exist`,
          );
        }

        await unlink(path);

        await ctx.send(
          `Removed \`${name.name}\` preset.`,
        );
      },

      list: async (ctx) => {
        const files = await readdir(EVAL_DIRECTORY);

        const presets = files
          .filter((file) => file.endsWith(".pitchscript"))
          .map((file) => file.slice(0, -".pitchscript".length));

        if (presets.length === 0) {
          await ctx.send(
            "You have no eval presets saved.",
          );
          return;
        }

        await ctx.sendList(presets);
      },

      run: async (ctx, name) => {
        if (!name) {
          throw new Error(
            "Argument missing when calling 'run'.",
          );
        }

        const path = resolve(
          EVAL_DIRECTORY,
          `${name.name}.pitchscript`,
        );

        if (!(await fileExists(path))) {
          throw new Error(
            `\`${name.name}\` does not exist`,
          );
        }

        if (!ctx.executeScript) {
          throw new Error(
            "The host must implement executeScript to run eval presets.",
          );
        }

        const source = await readFile(path, "utf8");

        await ctx.executeScript(source);
        await ctx.addReaction?.("✅");
      },
    },
  });
