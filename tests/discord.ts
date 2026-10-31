import {
  AttachmentBuilder,
  Events,
  type Client,
  type Message,
} from "discord.js";

import { messageList } from "./message-list.js";
import type { MessageListTransport } from "./message-list.js";
import type { PitchScriptCommandContext } from "./host.js";
import type { FCDexPitchScript } from "./fcdex-runtime.js";

export interface PitchScriptDiscordOptions {
  /**
   * Discord user IDs authorized to run PitchScript.
   */
  readonly ownerIds: readonly string[];

  /**
   * Enable detailed runtime errors.
   */
  readonly debug?: boolean;
}

export function extractPitchScriptCommand(
  content: string,
  botUserId: string,
): string | undefined {
  const escapedId = botUserId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

  const pattern = new RegExp(
    `^<@!?${escapedId}>\\s+run\\s+([\\s\\S]+)$`,
    "i",
  );

  const match = pattern.exec(content);

  return match?.[1];
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

function isDeletable(
  value: unknown,
): value is { delete(): Promise<unknown> } {
  return (
    typeof value === "object" &&
    value !== null &&
    "delete" in value &&
    typeof value.delete === "function"
  );
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

      return response
        ? { content: response.content }
        : null;
    },

    async deleteMessage(prompt) {
      if (isDeletable(prompt)) {
        await prompt.delete();
      }
    },

    async deletePromptAndResponse(prompt, response) {
      if (isDeletable(prompt)) {
        await prompt.delete().catch(() => undefined);
      }

      if (isDeletable(response)) {
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
        ...(files?.length
          ? { files: [...files] }
          : {}),
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

/**
 * Registers the mention-based run command.
 *
 * The host application must enable MessageContent intent
 * for Discord to expose message contents.
 */
export function registerPitchScriptDiscord(
  client: Client,
  engine: FCDexPitchScript,
  options: PitchScriptDiscordOptions,
): () => void {
  const ownerIds = new Set(options.ownerIds);

  const onMessage = async (message: Message) => {
    if (message.author.bot || !client.user) {
      return;
    }

    const source = extractPitchScriptCommand(
      message.content,
      client.user.id,
    );

    if (source === undefined) {
      return;
    }

    // Mirrors the owner-only restriction in the original cog.
    if (!ownerIds.has(message.author.id)) {
      return;
    }

    try {
      const context = createContext(client, message);
      const result = await engine.execute(source, context);

      if (result !== undefined) {
        await context.send(
          `\`\`\`ERROR: ${result}\`\`\``,
        );
        return;
      }

      await context.addReaction?.("✅");
    } catch (error) {
      const detail =
        error instanceof Error
          ? options.debug
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
