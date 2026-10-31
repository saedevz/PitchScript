import { PitchScriptParser } from "./parser.js";
import { PitchScriptDispatcher } from "./dispatcher.js";

import { createFCDexHost, type FCDexHostOptions } from "./fcdex-host.js";
import { createFCDexParserRegistry } from "./fcdex-models.js";

import { createGlobalCommands } from "./commands/global.js";
import { createFilterCommands } from "./commands/filter.js";
import { createEvalCommands } from "./commands/eval.js";
import { createFileCommands } from "./commands/file.js";
import { createTemplateCommands } from "./commands/template.js";

import { removeCodeMarkdown } from "./utils.js";

import type { PitchScriptCommandContext } from "./host.js";

export interface FCDexPitchScriptOptions {
  readonly host?: FCDexHostOptions;
}

export interface FCDexPitchScript {
  readonly parser: PitchScriptParser;

  execute(
    source: string,
    context: PitchScriptCommandContext,
  ): Promise<string | undefined>;
}

export function createFCDexPitchScript(
  prisma: unknown,
  options: FCDexPitchScriptOptions = {},
): FCDexPitchScript {
  const host = createFCDexHost(prisma, options.host);
  const parser = new PitchScriptParser(
    createFCDexParserRegistry(),
  );

  const dispatcher =
    new PitchScriptDispatcher<PitchScriptCommandContext>({
      global: createGlobalCommands(host),

      commandClasses: {
        Filter: createFilterCommands(host),
        Eval: createEvalCommands,
        File: createFileCommands,
        Template: createTemplateCommands,
      },
    });

  async function executeSource(
    source: string,
    context: PitchScriptCommandContext,
    attachments: unknown[],
  ): Promise<string | undefined> {
    const runtimeContext: PitchScriptCommandContext = {
      send: (content, files) => context.send(content, files),
      sendList: (messages) => context.sendList(messages),
      attachments,

      ...(context.waitForMessage
        ? {
            waitForMessage: (timeoutMs: number) =>
              context.waitForMessage!(timeoutMs),
          }
        : {}),

      ...(context.addReaction
        ? {
            addReaction: (emoji: string) =>
              context.addReaction!(emoji),
          }
        : {}),

      executeScript: async (savedSource: string) => {
        const result = await executeSource(
          savedSource,
          context,
          attachments,
        );

        if (result !== undefined) {
          throw new Error(result);
        }
      },
    };

    const parsed = parser.parse(
      removeCodeMarkdown(source),
    );

    return dispatcher.execute(
      parsed,
      runtimeContext,
      attachments,
    );
  }

  return {
    parser,

    execute(source, context) {
      const attachments = [
        ...(context.attachments ?? []),
      ];

      return executeSource(
        source,
        context,
        attachments,
      );
    },
  };
}
