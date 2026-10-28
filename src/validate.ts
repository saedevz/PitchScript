import type { PitchScriptCommand } from "./parser.js";

const SUPPORTED_RESOURCES = new Set([
  "CLUB",
  "CLUBS",
]);

export function validateCommand(
  command: PitchScriptCommand,
): void {
  if (!SUPPORTED_RESOURCES.has(command.resource)) {
    throw new Error(
      `Unsupported resource: ${command.resource}`,
    );
  }

  switch (command.operation) {
    case "VIEW":
      if (command.arguments.length < 2) {
        throw new Error(
          "VIEW requires a resource name and a property.",
        );
      }
      break;

    case "UPDATE":
      if (command.arguments.length < 3) {
        throw new Error(
          "UPDATE requires a resource name, property, and value.",
        );
      }
      break;

    case "DELETE":
      if (command.arguments.length < 1) {
        throw new Error(
          "DELETE requires a resource name.",
        );
      }
      break;

    case "CREATE":
      if (command.arguments.length < 1) {
        throw new Error(
          "CREATE requires resource data.",
        );
      }
      break;

    case "LIST":
      break;
  }
}
