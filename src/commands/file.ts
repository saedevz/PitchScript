import {
  readFile,
  writeFile,
  readdir,
  stat,
  unlink,
  rm,
} from "node:fs/promises";
import { resolve } from "node:path";

import type {
  PitchScriptCommandFactory,
  PitchScriptCommandInstance,
} from "../dispatcher.js";
import type {
  PitchScriptCommandContext,
} from "../host.js";
import type { PitchScriptValue } from "../types.js";

async function readAttachment(
  attachment: unknown,
): Promise<Uint8Array> {
  if (typeof attachment !== "object" || attachment === null) {
    throw new Error("The attachment is invalid.");
  }

  const item = attachment as Record<string, unknown>;

  if (typeof item.url === "string") {
    const response = await fetch(item.url);

    if (!response.ok) {
      throw new Error(
        `Failed to download attachment: HTTP ${response.status}.`,
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  if (typeof item.arrayBuffer === "function") {
    const data = await (
      item.arrayBuffer as () => Promise<ArrayBuffer>
    )();

    return new Uint8Array(data);
  }

  if (item.data instanceof Uint8Array) {
    return item.data;
  }

  if (item.attachment instanceof Uint8Array) {
    return item.attachment;
  }

  throw new Error(
    "The host attachment cannot be read as binary data.",
  );
}

export const createFileCommands:
  PitchScriptCommandFactory<PitchScriptCommandContext> =
  () => ({
    methods: {
      read: async (ctx, filePath) => {
        if (!filePath) {
          throw new Error(
            "Argument missing when calling 'read'.",
          );
        }

        await ctx.send("", [filePath.name]);
      },

      write: async (ctx, filePath) => {
        if (!filePath) {
          throw new Error(
            "Argument missing when calling 'write'.",
          );
        }

        const attachment = ctx.attachments?.[0];

        if (attachment === undefined) {
          throw new Error(
            "FILE > WRITE requires an attached file.",
          );
        }

        const contents = await readAttachment(attachment);

        await writeFile(
          filePath.name,
          Buffer.from(contents).toString("utf8"),
          "utf8",
        );

        await ctx.send(
          `Wrote to \`${filePath.name}\``,
        );
      },

      clear: async (ctx, filePath) => {
        if (!filePath) {
          throw new Error(
            "Argument missing when calling 'clear'.",
          );
        }

        const path = filePath.name;

        try {
          const details = await stat(path);

          if (!details.isFile()) {
            throw new Error(
              `'${path}' does not exist`,
            );
          }
        } catch (error) {
          if (
            error instanceof Error &&
            error.message === `'${path}' does not exist`
          ) {
            throw error;
          }

          throw new Error(`'${path}' does not exist`);
        }

        await writeFile(path, "", "utf8");

        await ctx.send(`Cleared \`${path}\``);
      },

      listdir: async (ctx, filePath) => {
        const path = filePath?.name ?? ".";
        const entries = await readdir(path);

        await ctx.sendList(entries);
      },

      delete: async (ctx, filePath) => {
        if (!filePath) {
          throw new Error(
            "Argument missing when calling 'delete'.",
          );
        }

        const path = filePath.name;
        const details = await stat(path);
        const isDirectory = details.isDirectory();

        if (isDirectory) {
          await rm(path, {
            recursive: true,
            force: false,
          });
        } else {
          await unlink(path);
        }

        const fileType = isDirectory
          ? "directory"
          : "file";

        await ctx.send(
          `Deleted \`${path}\` ${fileType}`,
        );
      },
    },
  });
