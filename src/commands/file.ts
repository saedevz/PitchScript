import { access, readdir, rm, stat, writeFile } from "node:fs/promises";
import type { PitchScriptValue } from "../types.js";
import type { PitchScriptCommandContext } from "../host.js";
import type {
  PitchScriptCommandFactory,
  PitchScriptSharedState,
} from "../dispatcher.js";

function filePath(token: PitchScriptValue | undefined, method: string): string {
  if (!token) {
    throw new TypeError(`Argument missing when calling '${method}'.`);
  }
  return String(token.value ?? token.name);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export const createFileCommands: PitchScriptCommandFactory<PitchScriptCommandContext> =
  (_shared: PitchScriptSharedState) => ({
    methods: {
      async read(context: PitchScriptCommandContext, pathToken?: PitchScriptValue) {
        const path = filePath(pathToken, "read");
        await context.send("", [path]);
      },

      async write(context: PitchScriptCommandContext, pathToken?: PitchScriptValue) {
        const path = filePath(pathToken, "write");
        const attachment = context.attachments?.[0];
        if (attachment === undefined) {
          throw new Error("An attachment is required to write a file.");
        }
        if (!context.readAttachment) {
          throw new Error("Attachment reading is not configured for this context.");
        }

        const contents = await context.readAttachment(attachment);
        await writeFile(path, contents, "utf8");
        context.attachments?.shift();
        await context.send(`Wrote to \`${pathToken!.name}\``);
      },

      async clear(context: PitchScriptCommandContext, pathToken?: PitchScriptValue) {
        const path = filePath(pathToken, "clear");
        if (!(await exists(path))) {
          throw new Error(`'${path}' does not exist`);
        }
        await writeFile(path, "", "utf8");
        await context.send(`Cleared \`${pathToken!.name}\``);
      },

      async listdir(context: PitchScriptCommandContext, pathToken?: PitchScriptValue) {
        const path = pathToken ? filePath(pathToken, "listdir") : ".";
        const entries = await readdir(path);
        await context.sendList(entries);
      },

      async delete(context: PitchScriptCommandContext, pathToken?: PitchScriptValue) {
        const path = filePath(pathToken, "delete");
        const details = await stat(path);
        const isDirectory = details.isDirectory();
        await rm(path, { recursive: isDirectory });
        await context.send(
          `Deleted \`${pathToken!.name}\` ${isDirectory ? "directory" : "file"}`,
        );
      },
    },
  });
