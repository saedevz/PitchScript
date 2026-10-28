import { PitchScriptParser } from "./parser.js";
import { removeCodeMarkdown } from "./utils.js";

import type {
  ParsedScript,
} from "./types.js";

import type {
  PitchScriptCommandContext,
} from "./host.js";

export interface PitchScriptRunnerContext
  extends PitchScriptCommandContext {
  attachments: unknown[];

  addReaction(emoji: string): Promise<void>;
}

export interface PitchScriptExecutor<Context> {
  execute(
    script: ParsedScript,
    context: Context,
    attachments?: unknown[],
  ): Promise<string | undefined>;
}

export interface PitchScriptRunOptions {
  debug?: boolean;
}

/**
 * Executes parsed PitchScript through the configured executor.
 * Discord permission checks belong in the Discord integration.
 */
export async function runPitchScript<
  Context extends PitchScriptRunnerContext,
>(
  code: string,
  parser: PitchScriptParser,
  executor: PitchScriptExecutor<Context>,
  context: Context,
  options: PitchScriptRunOptions = {},
): Promise<void> {
  try {
    const source = removeCodeMarkdown(code);
    const parsed = parser.parse(source);

    const result = await executor.execute(
      parsed,
      context,
      context.attachments,
    );

    if (result !== undefined) {
      await context.send(`\`\`\`ERROR: ${result}\`\`\``);
      return;
    }

    await context.addReaction("✅");
  } catch (error: unknown) {
    const message =
      error instanceof Error
        ? options.debug
          ? error.stack ?? error.message
          : error.message
        : String(error);

    await context.send(`\`\`\`ERROR: ${message}\`\`\``);
  }
}

export { removeCodeMarkdown };
