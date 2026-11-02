import { access, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { PitchScriptValue } from "../types.js";
import type { PitchScriptCommandContext } from "../host.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptSharedState,
} from "../dispatcher.js";
import { removeCodeMarkdown } from "../utils.js";

export const EVAL_PRESETS_DIRECTORY = "eval_presets";
const NAME_LIMIT = 100;

function presetName(token: PitchScriptValue | undefined, method: string): string {
  if (!token) {
    throw new TypeError(`Argument missing when calling '${method}'.`);
  }

  const name = String(token.value ?? token.name);
  if (
    name.length === 0 ||
    name.length > NAME_LIMIT ||
    name === "." ||
    name === ".." ||
    !/^[\p{L}\p{N}_ -]+$/u.test(name)
  ) {
    throw new Error(`'${name}' is not a valid eval preset name.`);
  }
  return name;
}

function presetPath(name: string): string {
  return join(EVAL_PRESETS_DIRECTORY, `${name}.pitchscript`);
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch (error) {
    if (
      error instanceof Error &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return false;
    }
    throw error;
  }
}

export const createEvalCommands: PitchScriptCommandFactory<PitchScriptCommandContext> =
  (_shared: PitchScriptSharedState) => ({
    async loaded() {
      await mkdir(EVAL_PRESETS_DIRECTORY, { recursive: true });
    },

    methods: {
      async save(
        context: PitchScriptCommandContext,
        nameToken?: PitchScriptValue,
      ) {
        const name = presetName(nameToken, "save");
        const path = presetPath(name);

        if (await fileExists(path)) {
          throw new Error(`\`${name}\` already exists.`);
        }

        await context.send("Please send the eval command below...");

        if (!context.waitForMessage) {
          throw new Error("Message collection is not configured for this context.");
        }

        const message = await context.waitForMessage(20_000);
        if (!message) {
          await context.send("Eval preset saving has timed out.");
          return;
        }

        await writeFile(path, removeCodeMarkdown(message.content), "utf8");
        await context.send(`\`${name}\` eval preset has been saved!`);
      },

      async remove(
        context: PitchScriptCommandContext,
        nameToken?: PitchScriptValue,
      ) {
        const name = presetName(nameToken, "remove");
        const path = presetPath(name);

        try {
          await rm(path);
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            throw new Error(`\`${name}\` does not exists`);
          }
          throw error;
        }

        await context.send(`Removed \`${name}\` preset.`);
      },

      async list(context: PitchScriptCommandContext) {
        await mkdir(EVAL_PRESETS_DIRECTORY, { recursive: true });
        const presets = await readdir(EVAL_PRESETS_DIRECTORY);
        if (presets.length === 0) {
          await context.send("You have no eval presets saved.");
          return;
        }
        await context.sendList(presets);
      },

      async run(
        context: PitchScriptCommandContext,
        nameToken?: PitchScriptValue,
      ) {
        const name = presetName(nameToken, "run");
        let source: string;
        try {
          source = await readFile(presetPath(name), "utf8");
        } catch (error) {
          if (
            error instanceof Error &&
            "code" in error &&
            error.code === "ENOENT"
          ) {
            throw new Error(`\`${name}\` does not exists`);
          }
          throw error;
        }

        if (!context.executeScript) {
          throw new Error("PitchScript execution is not configured for this context.");
        }

        await context.executeScript(source);
        await context.addReaction?.("✅");
      },
    },
  });
