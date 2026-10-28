import { PitchScriptParser } from "./parser.js";
import type {
  ParsedScript,
  PitchScriptValue,
} from "./types.js";
import type { PitchScriptCommandContext } from "./host.js";

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

const START_CODE_BLOCK_RE = /^((```sql?)(?=\s)|(```))/;

/**
 * Mirrors Utils.remove_code_markdown from DexScript.
 */
export function removeCodeMarkdown(content: string): string {
  if (content.startsWith("```") && content.endsWith("```")) {
    return content.replace(START_CODE_BLOCK_RE, "").slice(0, -3);
  }

  return content.replace(/^[` \n]+|[` \n]+$/g, "");
}

/**
 * Executes a PitchScript script and reports its result through
 * the supplied command context.
 *
 * The caller is responsible for enforcing Discord owner-only
 * access, matching the original @commands.is_owner() restriction.
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
    let message: string;

    if (error instanceof Error) {
      message =
        options.debug === true
          ? error.stack ?? error.message
          : error.message;
    } else {
      message = String(error);
    }

    await context.send(`\`\`\`ERROR: ${message}\`\`\``);
  }
}
