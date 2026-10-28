export type PitchScriptOperation = "VIEW" | "UPDATE" | "DELETE" | "CREATE" | "LIST";

export interface PitchScriptCommand {
  readonly operation: PitchScriptOperation;
  readonly resource: string;
  readonly arguments: readonly string[];
}

const SUPPORTED_OPERATIONS = new Set<PitchScriptOperation>([
  "VIEW",
  "UPDATE",
  "DELETE",
  "CREATE",
  "LIST",
]);

export function parsePitchScript(source: string): PitchScriptCommand {
  const parts = source
    .split(">")
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length < 2) {
    throw new Error("Invalid command: expected at least OPERATION > RESOURCE.");
  }

  const operation = parts[0]?.toUpperCase();

  if (!operation || !SUPPORTED_OPERATIONS.has(operation as PitchScriptOperation)) {
    throw new Error(`Unsupported operation: ${parts[0] ?? ""}`);
  }

  const resource = parts[1]?.toUpperCase();

  if (!resource) {
    throw new Error("Missing resource.");
  }

  return {
    operation: operation as PitchScriptOperation,
    resource,
    arguments: parts.slice(2),
  };
}
