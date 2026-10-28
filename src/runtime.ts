import type {
  CreateClubInput,
  PitchScriptAdapter,
} from "./adapter.js";
import type { PitchScriptCommand } from "./parser.js";

export async function executeCommand(
  command: PitchScriptCommand,
  adapter: PitchScriptAdapter,
): Promise<string> {
  switch (command.operation) {
    case "VIEW": {
      const [name, property] = command.arguments;

      if (!name || !property) {
        throw new Error(
          "VIEW requires a club name and property.",
        );
      }

      const club = await adapter.getClub(name);

      if (!club) {
        throw new Error(`Club "${name}" was not found.`);
      }

      const key = property.toLowerCase();

      if (!(key in club)) {
        throw new Error(
          `Unknown club property "${property}".`,
        );
      }

      const value: unknown = club[key];

      if (value === undefined || value === null) {
        throw new Error(
          `Property "${property}" has no value.`,
        );
      }

      return String(value);
    }

    case "LIST": {
      const clubs = await adapter.listClubs();

      return clubs.map((club) => club.name).join("\n");
    }

    case "UPDATE": {
      const [name, property, ...valueParts] =
        command.arguments;

      if (!name || !property || valueParts.length === 0) {
        throw new Error(
          "UPDATE requires a club name, property, and value.",
        );
      }

      const value = valueParts.join(" ");

      const updatedClub = await adapter.updateClub(
        name,
        property,
        value,
      );

      if (!updatedClub) {
        throw new Error(`Club "${name}" was not found.`);
      }

      return `Updated ${updatedClub.name}: ${property} = ${value}`;
    }

    case "DELETE": {
      const [name] = command.arguments;

      if (!name) {
        throw new Error("DELETE requires a club name.");
      }

      const deleted = await adapter.deleteClub(name);

      if (!deleted) {
        throw new Error(`Club "${name}" was not found.`);
      }

      return `Deleted club "${name}".`;
    }

    case "CREATE": {
      const [name, rarity, ...countryParts] =
        command.arguments;

      if (!name || !rarity) {
        throw new Error(
          "CREATE requires a club name and rarity.",
        );
      }

      const input: CreateClubInput = {
        name,
        rarity,
        ...(countryParts.length > 0
          ? { country: countryParts.join(" ") }
          : {}),
      };

      const createdClub = await adapter.createClub(input);

      return `Created club "${createdClub.name}" with rarity ${createdClub.rarity}.`;
    }
  }
}
