export interface ListMessage {
  readonly content: string;
}

export interface MessageListTransport {
  send(content: string): Promise<unknown>;

  /**
   * Returns a choice from the invoking user in the same channel.
   * Return null when the 15-second timeout expires.
   */
  waitForChoice(
    timeoutMs: number,
  ): Promise<ListMessage | null>;

  deleteMessage(message: unknown): Promise<void>;

  deletePromptAndResponse(
    prompt: unknown,
    response: ListMessage,
  ): Promise<void>;

  sendTextFile(
    contents: string,
    filename: string,
  ): Promise<void>;
}

/**
 * Port of Utils.message_list().
 *
 * Pages are grouped using the original 750-character threshold.
 * The caller owns the transport and Discord permissions.
 */
export async function messageList(
  transport: MessageListTransport,
  messages: readonly string[],
): Promise<void> {
  const pages: string[][] = [[]];
  let pageLength = 0;

  for (const message of messages) {
    if (pageLength >= 750) {
      pageLength = 0;
      pages.push([]);
    }

    pageLength += message.length;
    pages[pages.length - 1]!.push(message);
  }

  for (let index = 0; index < pages.length; index++) {
    const page = pages[index]!;

    await transport.send(
      `\`\`\`\n${page.join("\n")}\n\`\`\``,
    );

    if (index === pages.length - 1) {
      break;
    }

    const remaining = pages.length - index - 1;

    const remainingText =
      remaining === 1
        ? "There is `1` page remaining."
        : `There are \`${remaining}\` pages remaining.`;

    const prompt = await transport.send(
      `${remainingText} Type \`more\` to continue or \`file\` to send all messages in a file`,
    );

    let response: ListMessage | null;

    try {
      response = await transport.waitForChoice(15_000);
    } catch {
      response = null;
    }

    if (response === null) {
      try {
        await transport.deleteMessage(prompt);
      } catch {
        // The original suppresses Discord HTTP errors here.
      }

      break;
    }

    try {
      await transport.deletePromptAndResponse(
        prompt,
        response,
      );
    } catch {
      // The original suppresses Discord HTTP errors here.
    }

    if (response.content.toLowerCase() === "more") {
      continue;
    }

    await transport.sendTextFile(
      messages.join("\n"),
      "output.txt",
    );

    break;
  }
}
