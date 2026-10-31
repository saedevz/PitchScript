import {
  AttachmentBuilder,
  EmbedBuilder,
  Events,
  type Client,
  type Message,
} from "discord.js";

import { messageList } from "./message-list.js";
import type { MessageListTransport } from "./message-list.js";
import type { PitchScriptCommandContext } from "./host.js";
import type { FCDexPitchScript } from "./fcdex-runtime.js";

import {
  applySetting,
  createDefaultSettings,
  type PitchScriptSettings,
} from "./settings.js";

import { checkPitchScriptVersion } from "./version.js";

export interface PitchScriptDiscordOptions {
  readonly ownerIds: readonly string[];
  readonly debug?: boolean;
  readonly version?: string;
  readonly repository?: string;
  readonly guideUrl?: string;
  readonly supportUrl?: string;
  readonly thumbnailUrl?: string;
  readonly settings?: PitchScriptSettings;
}

export interface MentionCommand {
  readonly name: string;
  readonly arguments: string;
}

export function parseMentionCommand(
  content: string,
  botUserId: string,
): MentionCommand | undefined {
  const escapedId = botUserId.replace(
    /[.*+?^${}()|[\]\\]/g,
    "\\$&",
  );

  const pattern = new RegExp(
    `^<@!?${escapedId}>\\s+(run|about|setting)\\b(?:\\s+([\\s\\S]*))?$`,
    "i",
  );

  const match = pattern.exec(content);

  if (!match) {
    return undefined;
  }

  return {
    name: match[1]!.toLowerCase(),
    arguments: match[2] ?? "",
  };
}

export function extractPitchScriptCommand(
  content: string,
  botUserId: string,
): string | undefined {
  const command = parseMentionCommand(content, botUserId);

  if (command?.name !== "run") {
    return undefined;
  }

  return command.arguments || undefined;
}

function getSendableChannel(message: Message) {
  const channel = message.channel;

  if (!channel.isSendable()) {
    throw new Error(
      "PitchScript cannot send messages in this channel.",
    );
  }

  return channel;
}

function createMessageWaiter(
  client: Client,
  message: Message,
  timeoutMs: number,
  validContent?: readonly string[],
): Promise<Message | null> {
  return new Promise((resolve) => {
    let finished = false;

    const finish = (result: Message | null) => {
      if (finished) return;
      finished = true;

      clearTimeout(timer);
      client.off(Events.MessageCreate, onMessage);
      resolve(result);
    };

    const onMessage = (candidate: Message) => {
      if (
        candidate.author.bot ||
        candidate.author.id !== message.author.id ||
        candidate.channelId !== message.channelId
      ) {
        return;
      }

      if (
        validContent &&
        !validContent.includes(candidate.content.toLowerCase())
      ) {
        return;
      }

      finish(candidate);
    };

    const timer = setTimeout(
      () => finish(null),
      timeoutMs,
    );

    client.on(Events.MessageCreate, onMessage);
  });
}

function createContext(
  client: Client,
  message: Message,
): PitchScriptCommandContext {
  const channel = getSendableChannel(message);

  const transport: MessageListTransport = {
    async send(content) {
      return channel.send({ content });
    },

    async waitForChoice(timeoutMs) {
      const response = await createMessageWaiter(
        client,
        message,
        timeoutMs,
        ["more", "file"],
      );

      return response;
    },

    async deleteMessage(prompt) {
      if (
        typeof prompt === "object" &&
        prompt !== null &&
        "delete" in prompt &&
        typeof prompt.delete === "function"
      ) {
        await prompt.delete();
      }
    },

    async deletePromptAndResponse(prompt, response) {
      if (
        typeof prompt === "object" &&
        prompt !== null &&
        "delete" in prompt &&
        typeof prompt.delete === "function"
      ) {
        await prompt.delete().catch(() => undefined);
      }

      if (
        typeof response === "object" &&
        response !== null &&
        "delete" in response &&
        typeof response.delete === "function"
      ) {
        await response.delete().catch(() => undefined);
      }
    },

    async sendTextFile(contents, filename) {
      await channel.send({
        files: [
          new AttachmentBuilder(
            Buffer.from(contents, "utf8"),
            { name: filename },
          ),
        ],
      });
    },
  };

  return {
    attachments: [...message.attachments.values()],

    async send(content, files) {
      await channel.send({
        ...(content ? { content } : {}),
        ...(files?.length ? { files: [...files] } : {}),
      });
    },

    async sendList(messages) {
      await messageList(transport, messages);
    },

    async waitForMessage(timeoutMs) {
      const response = await createMessageWaiter(
        client,
        message,
        timeoutMs,
      );

      return response
        ? { content: response.content }
        : null;
    },

    async addReaction(emoji) {
      await message.react(emoji);
    },
  };
}

export function registerPitchScriptDiscord(
  client: Client,
  engine: FCDexPitchScript,
  options: PitchScriptDiscordOptions,
): () => void {
  const ownerIds = new Set(options.ownerIds);
  const settings = options.settings ?? createDefaultSettings();
  const version = options.version ?? "0.1.0";

  const onMessage = async (message: Message) => {
    if (message.author.bot || !client.user) {
      return;
    }

    const command = parseMentionCommand(
      message.content,
      client.user.id,
    );

    if (!command) {
      return;
    }

    // All registered commands mirror the original owner-only restriction.
    if (!ownerIds.has(message.author.id)) {
      return;
    }

    try {
      switch (command.name) {
        case "run": {
          if (!command.arguments.trim()) {
            await message.reply(
              "Argument missing when calling 'run'.",
            );
            return;
          }

          const notice = await checkPitchScriptVersion(
            settings,
            {
              currentVersion: version,
              repository: options.repository,
            },
          );

          if (notice) {
            await message.channel.send({
              content: `-# ${notice}`,
            });
          }

          const context = createContext(client, message);
          const result = await engine.execute(
            command.arguments,
            context,
          );

          if (result !== undefined) {
            await context.send(
              `\`\`\`ERROR: ${result}\`\`\``,
            );
            return;
          }

          await message.react("✅");
          return;
        }

        case "about": {
          const notice = await checkPitchScriptVersion(
            settings,
            {
              currentVersion: version,
              repository: options.repository,
            },
          );

          const description = [
            "PitchScript is a TypeScript implementation of the DexScript DSL for FCDex.",
            options.guideUrl
              ? `Refer to the [PitchScript guide](<${options.guideUrl}>) for command information.`
              : undefined,
            options.supportUrl
              ? `For assistance, visit the [support community](<${options.supportUrl}>).`
              : undefined,
          ]
            .filter((line): line is string => Boolean(line))
            .join("\n\n");

          const embed = new EmbedBuilder()
            .setTitle("PitchScript")
            .setDescription(description)
            .setColor("#03BAFC")
            .setFooter({
              text:
                `PitchScript ${version} ` +
                `(${notice ? "OUTDATED" : "LATEST"}) • FCDex`,
            });

          if (options.thumbnailUrl) {
            embed.setThumbnail(options.thumbnailUrl);
          }

          await message.reply({
            embeds: [embed],
          });

          return;
        }

        case "setting": {
          const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(
            command.arguments.trim(),
          );

          if (!match) {
            await message.reply(
              "Argument missing when calling 'setting'.",
            );
            return;
          }

          const settingName = match[1]!;
          const value = match[2];

          const result = applySetting(
            settings,
            settingName,
            value,
          );

          await message.reply(result.message);
          return;
        }
      }
    } catch (error) {
      const detail =
        error instanceof Error
          ? options.debug ?? settings.debug
            ? error.stack ?? error.message
            : error.message
          : String(error);

      try {
        await message.channel.send({
          content: `\`\`\`ERROR: ${detail}\`\`\``,
        });
      } catch (sendError) {
        console.error(
          "[PitchScript] Could not send execution error:",
          sendError,
        );
      }
    }
  };

  client.on(Events.MessageCreate, onMessage);

  return () => {
    client.off(Events.MessageCreate, onMessage);
  };
}
