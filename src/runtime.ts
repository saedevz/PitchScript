import type { PitchScriptAdapter } from "./adapter.js";
import type { PitchScriptCommand } from "./parser.js";

export async function executeCommand(
  command: PitchScriptCommand,
  adapter: PitchScriptAdapter,
): Promise<string> {
  switch (command.operation) {
    case "VIEW": {
      const [name, property] = command.arguments;

      if (!name || !property) {
        throw new Error("VIEW requires a club name and property.");
      }

      const club = await adapter.getClub(name);

      if (!club) {
        throw new Error(`Club "${name}" was not found.`);
      }

      const key = property.toLowerCase();

      if (!(key in club)) {
        throw new Error(`Unknown club property "${property}".`);
      }

      const value: unknown = club[key];

      if (value === undefined || value === null) {
        throw new Error(`Property "${property}" has no value.`);
      }

      return String(value);
    }

    case "LIST": {
      const clubs = await adapter.listClubs();
      return clubs.map((club) => club.name).join("\n");
    }

    case "UPDATE":
      throw new Error("UPDATE execution is not implemented yet.");

    case "DELETE":
      throw new Error("DELETE execution is not implemented yet.");

    case "CREATE":
      throw new Error("CREATE execution is not implemented yet.");
  }
}
