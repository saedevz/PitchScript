import type { PitchScriptValue } from "./types.js";

export interface PitchScriptFieldInfo {
  readonly name: string;
  readonly typeName: string;
  readonly nullable: boolean;
  readonly maxLength?: number;
}

export interface PitchScriptMessage {
  readonly content: string;
}

/**
 * Host services supplied by the application running PitchScript.
 * The additional interaction hooks are optional so the core command
 * handlers can also be used with non-Discord transports.
 */
export interface PitchScriptCommandContext {
  send(
    content: string,
    files?: readonly string[],
  ): Promise<void>;

  sendList(messages: readonly string[]): Promise<void>;

  attachments?: unknown[];

  waitForMessage?(timeoutMs: number): Promise<PitchScriptMessage | null>;

  executeScript?(source: string): Promise<void>;

  addReaction?(emoji: string): Promise<void>;

  readAttachment?(attachment: unknown): Promise<string>;
}

export interface PitchScriptHost {
  createModel(
    model: PitchScriptValue,
    identifier: string,
  ): Promise<void>;

  getModel(
    model: PitchScriptValue,
    identifier: string,
  ): Promise<unknown>;

  deleteRecord(record: unknown): Promise<void>;

  getFields(
    model: PitchScriptValue,
  ): readonly PitchScriptFieldInfo[];

  hasAttribute(
    model: PitchScriptValue,
    attribute: string,
  ): boolean;

  getRecordEntries(
    record: unknown,
  ): Iterable<readonly [string, unknown]>;

  getRecordValue(
    record: unknown,
    attribute: string,
  ): unknown;

  setRecordValue(
    record: unknown,
    attribute: string,
    value: unknown,
  ): void;

  saveRecord(
    record: unknown,
    updateFields: readonly string[],
  ): Promise<void>;

  getPrimaryKey(record: unknown): unknown;

  getRelatedIdentifiers(
    relation: unknown,
    identifierField: string,
  ): Promise<unknown>;

  saveAttachment(attachment: unknown): Promise<string>;

  uploadedImageValue(relativePath: string): string;

  isImage(path: string): boolean;

  imagePath(path: string): string;

  formatValue(value: unknown): string;
}
