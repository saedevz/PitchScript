export interface PitchScriptOptions {
  /**
   * Whether to allow commands that modify data.
   */
  readonly allowMutations?: boolean;
}

export interface PitchScriptResult {
  readonly success: boolean;
  readonly output?: string;
  readonly error?: string;
}

export interface PitchScriptEngine {
  execute(
    source: string,
  ): Promise<PitchScriptResult>;
}

export function createPitchScript(
  options: PitchScriptOptions = {},
): PitchScriptEngine {
  return {
    async execute(source: string): Promise<PitchScriptResult> {
      if (!source.trim()) {
        return {
          success: false,
          error: "Empty PitchScript command.",
        };
      }

      return {
        success: false,
        error: "PitchScript parser is not implemented yet.",
      };
    },
  };
}
