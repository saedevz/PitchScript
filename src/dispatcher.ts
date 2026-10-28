import {
  ValueType,
  type ParsedScript,
  type PitchScriptValue
} from "./types.js";

export interface PitchScriptSharedState {
  attachments: unknown[];
}

type MaybePromise<T> = T | Promise<T>;

export type PitchScriptMethodHandler<Context> = (
  context: Context,
  ...args: PitchScriptValue[]
) => MaybePromise<unknown>;

export interface PitchScriptCommandInstance<Context> {
  loaded?: () => MaybePromise<void>;

  methods: Readonly<
    Record<string, PitchScriptMethodHandler<Context>>
  >;
}

export type PitchScriptCommandFactory<Context> = (
  shared: PitchScriptSharedState
) => PitchScriptCommandInstance<Context>;

export interface PitchScriptDispatcherOptions<Context> {
  global: PitchScriptCommandFactory<Context>;

  commandClasses: Readonly<
    Record<string, PitchScriptCommandFactory<Context>>
  >;

  debug?: boolean;
}

export class PitchScriptDispatcher<Context> {
  constructor(
    private readonly options: PitchScriptDispatcherOptions<Context>
  ) {}

  async execute(
    script: ParsedScript,
    context: Context,
    attachments: unknown[] = []
  ): Promise<string | undefined> {
    // Shared state persists across commands in this execution.
    const shared: PitchScriptSharedState = { attachments };

    for (const line of script) {
      if (line.length === 0) {
        continue;
      }

      const first = line[0];

      if (
        !first ||
        (first.type !== ValueType.METHOD &&
          first.type !== ValueType.CLASS)
      ) {
        return this.formatError(
          `'${first?.name ?? ""}' is not a valid command.`
        );
      }

      let factory: PitchScriptCommandFactory<Context>;
      let commandName: string;
      let methodToken: PitchScriptValue;
      let args: PitchScriptValue[];

      if (first.type === ValueType.METHOD) {
        factory = this.options.global;
        commandName = "Global";
        methodToken = first;
        args = line.slice(1);
      } else {
        const method = line[1];

        if (!method) {
          throw new Error(
            `Missing method for command class '${first.name}'.`
          );
        }

        const classEntry = Object.entries(
          this.options.commandClasses
        ).find(
          ([name]) =>
            name.toLowerCase() === first.name.toLowerCase()
        );

        if (!classEntry) {
          throw new Error(
            `'${first.name}' is not a registered command class.`
          );
        }

        factory = classEntry[1];
        commandName = classEntry[0];
        methodToken = method;
        args = line.slice(2);
      }

      // DexScript creates a command instance and calls __loaded__()
      // for every command line.
      const instance = factory(shared);

      await instance.loaded?.();

      const methodEntry = Object.entries(
        instance.methods
      ).find(
        ([name]) =>
          name.toLowerCase() === methodToken.name.toLowerCase()
      );

      if (!methodEntry) {
        throw new Error(
          `'${methodToken.name}' is not a valid method for '${commandName}'.`
        );
      }

      try {
        await methodEntry[1](context, ...args);
      } catch (error) {
        // Mirrors DexScript's TypeError handling around method calls.
        if (error instanceof TypeError) {
          const message =
            `Argument missing when calling '${methodToken.name}'.`;

          return this.formatError(message, error);
        }

        throw error;
      }
    }

    return undefined;
  }

  private formatError(
    message: string,
    error?: unknown
  ): string {
    if (this.options.debug && error instanceof Error) {
      return error.stack ?? error.message;
    }

    return message;
  }
}
