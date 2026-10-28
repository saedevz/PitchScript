import {
  ValueType,
  type ModelDefinition,
  type ParsedScript,
  type PitchScriptRegistry,
  type PitchScriptValue
} from "./types.js";

export class PitchScriptParser {
  private readonly globalMethods: ReadonlySet<string>;
  private readonly commandClasses: ReadonlySet<string>;
  private readonly models: ReadonlyMap<string, ModelDefinition>;

  constructor(registry: PitchScriptRegistry) {
    this.globalMethods = new Set(
      registry.globalMethods.map((method) => method.toLowerCase())
    );

    this.commandClasses = new Set(
      registry.commandClasses.map((commandClass) =>
        commandClass.toLowerCase()
      )
    );

    this.models = new Map(
      registry.models.map((model) => [
        model.name.toLowerCase(),
        model
      ])
    );
  }

  createValue(input: string): PitchScriptValue {
    const line = input.trim();
    const lower = line.toLowerCase();

    const value: PitchScriptValue = {
      name: line,
      type: ValueType.DEFAULT,
      value: line,
      extraData: []
    };

    // Match the original parser's type-recognition precedence.
    if (this.globalMethods.has(lower)) {
      value.type = ValueType.METHOD;
      return value;
    }

    if (this.commandClasses.has(lower)) {
      value.type = ValueType.CLASS;
      return value;
    }

    const model = this.models.get(lower);

    if (model) {
      value.name = model.name;
      value.type = ValueType.MODEL;
      value.value = model.value;
      value.extraData.push(model.identifierField);

      return value;
    }

    if (lower === "true" || lower === "false") {
      value.type = ValueType.BOOLEAN;
      value.value = lower === "true";

      return value;
    }

    // The original recognizes dates only when its date parser
    // accepts the value and the input contains at least two hyphens.
    const hyphenCount = [...lower].filter(
      (character) => character === "-"
    ).length;

    if (hyphenCount >= 2) {
      const parsedDate = new Date(line);

      if (!Number.isNaN(parsedDate.getTime())) {
        value.type = ValueType.DATETIME;
        value.value = parsedDate;
      }
    }

    return value;
  }

  parse(code: string): ParsedScript {
    const lines = code
      .split("\n")
      .filter((line) => line.trim() !== "")
      .filter((line) => !line.trim().startsWith("--"));

    return lines.map((line) => {
      const tokens = line.match(/[^>]+/g) ?? [];

      return tokens.map((token) =>
        this.createValue(token.trim())
      );
    });
  }
}
