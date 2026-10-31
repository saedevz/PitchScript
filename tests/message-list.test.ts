import {
  describe,
  expect,
  it,
  vi,
} from "vitest";

import {
  messageList,
  type MessageListTransport,
} from "../src/message-list.js";

function createTransport() {
  const transport: MessageListTransport = {
    send: vi.fn(async () => ({})),

    waitForChoice: vi.fn(async () => ({
      content: "more",
    })),

    deleteMessage: vi.fn(async () => {}),

    deletePromptAndResponse: vi.fn(async () => {}),

    sendTextFile: vi.fn(async () => {}),
  };

  return transport;
}

describe("messageList", () => {
  it("sends an empty list as one empty page", async () => {
    const transport = createTransport();

    await messageList(transport, []);

    expect(transport.send).toHaveBeenCalledWith(
      "```\n\n```",
    );
  });

  it("sends a short list without prompting", async () => {
    const transport = createTransport();

    await messageList(transport, [
      "Example FC",
      "Another FC",
    ]);

    expect(transport.send).toHaveBeenCalledOnce();

    expect(transport.send).toHaveBeenCalledWith(
      "```\nExample FC\nAnother FC\n```",
    );

    expect(transport.waitForChoice).not.toHaveBeenCalled();
  });

  it("prompts when the list spans multiple pages", async () => {
    const transport = createTransport();

    const messages = [
      "x".repeat(751),
      "Another FC",
    ];

    await messageList(transport, messages);

    expect(transport.send).toHaveBeenCalledTimes(3);

    expect(transport.waitForChoice).toHaveBeenCalledWith(
      15_000,
    );

    expect(
      transport.deletePromptAndResponse,
    ).toHaveBeenCalledOnce();
  });

  it("exports all items when the user chooses file", async () => {
    const transport = createTransport();

    vi.mocked(transport.waitForChoice).mockResolvedValueOnce({
      content: "file",
    });

    const messages = [
      "x".repeat(751),
      "Another FC",
    ];

    await messageList(transport, messages);

    expect(transport.sendTextFile).toHaveBeenCalledWith(
      messages.join("\n"),
      "output.txt",
    );
  });

  it("deletes the prompt and stops when the prompt times out", async () => {
    const transport = createTransport();

    vi.mocked(transport.waitForChoice).mockResolvedValueOnce(
      null,
    );

    await messageList(transport, [
      "x".repeat(751),
      "Another FC",
    ]);

    expect(transport.deleteMessage).toHaveBeenCalledOnce();

    expect(
      transport.deletePromptAndResponse,
    ).not.toHaveBeenCalled();

    expect(transport.sendTextFile).not.toHaveBeenCalled();
  });

  it("continues when the user chooses more", async () => {
    const transport = createTransport();

    await messageList(transport, [
      "x".repeat(751),
      "Another FC",
    ]);

    expect(transport.send).toHaveBeenCalledTimes(3);

    expect(transport.sendTextFile).not.toHaveBeenCalled();
  });
});
