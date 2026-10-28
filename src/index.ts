import { parsePitchScript } from "./parser.js";
import { validateCommand } from "./validate.js";
import { executeCommand } from "./runtime.js";
import type { PitchScriptAdapter } from "./adapter.js";

export interface PitchScriptOptions {
  readonly adapter: PitchScriptAdapter;
  readonly allowMutations?: boolean;
}

export interface PitchScriptResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
}

export interface PitchScriptEngine {
  execute(source: string): Promise<PitchScriptResult>;
}

export function createPitchScript(
  options: PitchScriptOptions,
): PitchScriptEngine {
  return {
    async execute(source): Promise<PitchScriptResult> {
      try {
        if (!source.trim()) {
          throw new Error("Empty PitchScript command.");
        }

        const command = parsePitchScript(source);
        validateCommand(command);

        if (
          options.allowMutations === false &&
          ["UPDATE", "DELETE", "CREATE"].includes(command.operation)
        ) {
          throw new Error("Mutations are disabled.");
        }

        const output = await executeCommand(
          command,
          options.adapter,
        );

        return { success: true, output };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "An unknown error occurred.",
        };
      }
    },
  };
}

export { parsePitchScript } from "./parser.js";
export { validateCommand } from "./validate.js";
export { executeCommand } from "./runtime.js";
export { EvalRegistry } from "./evals.js";

export type {
  PitchScriptCommand,
  PitchScriptOperation,
} from "./parser.js";

export type { PitchScriptAdapter, ClubRecord } from "./adapter.js";
