export enum ValueType {
  DEFAULT = 0,
  METHOD = 1,
  CLASS = 2,
  BOOLEAN = 3,
  MODEL = 4,
  DATETIME = 5
}

export interface ModelDefinition<TModel = unknown> {
  readonly name: string;
  readonly identifierField: string;
  readonly value: TModel;
}

export interface PitchScriptRegistry {
  readonly globalMethods: readonly string[];
  readonly commandClasses: readonly string[];
  readonly models: readonly ModelDefinition[];
}

export interface PitchScriptValue {
  name: string;
  type: ValueType;
  value: unknown;
  extraData: unknown[];
}

export type ParsedScript = PitchScriptValue[][];
