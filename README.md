# PitchScript

PitchScript is a TypeScript port of the DexScript command DSL, adapted for the FCDex Prisma models. The syntax stays command-oriented; scripts are still plain text and are not JavaScript or TypeScript source code.

## Current support

PitchScript includes:

- The original command parser and sequential dispatcher.
- Global model commands: `CREATE`, `DELETE`, `UPDATE`, `VIEW`, and `ATTRIBUTES`.
- `FILTER` bulk update, delete, and view commands.
- Saved PitchScript presets through `EVAL > SAVE`, `REMOVE`, `LIST`, and `RUN`.
- `FILE` read, write, clear, list-directory, and delete commands.
- The `TEMPLATE > CREATE` helper for the FCDex `CLUB` model.
- A Discord.js message-command adapter and a Prisma-backed FCDex host.

The FCDex registry currently exposes `CLUB` (mapped to Prisma's `Ball` model) and `SPECIAL`. `REGIME` and `ECONOMY` are not registered because they are not present as Prisma models in the supplied FCDex schema.

## Syntax

```text
CREATE > CLUB > Manchester City
UPDATE > CLUB > Manchester City > RARITY > T5
VIEW > CLUB > Manchester City > RARITY
ATTRIBUTES > CLUB

FILTER > UPDATE > CLUB > RARITY > T5 > T3
FILTER > DELETE > CLUB > RARITY > T5 > GT
FILTER > VIEW > CLUB > RARITY > T5

EVAL > SAVE > rarity-update
EVAL > RUN > rarity-update
EVAL > LIST
EVAL > REMOVE > rarity-update

FILE > READ > README.md
FILE > WRITE > output.txt
FILE > CLEAR > output.txt
FILE > LISTDIR
FILE > DELETE > output.txt

TEMPLATE > CREATE > CLUB > Manchester City
```

To execute a script in Discord, mention the bot and use `run`, for example:

```text
@FCDex run VIEW > CLUB > Manchester City > RARITY
```

The Discord adapter restricts commands to the configured `ownerIds`, matching the owner-only behavior of the original DexScript command.

## Installation and build

Node.js 20 or newer is required.

```bash
npm install
npm run build
npm test
```

## FCDex integration

Create the Prisma-backed engine and register the message handler:

```ts
import { Client } from "discord.js";
import { PrismaClient } from "./generated/prisma/client.js";
import {
  createFCDexPitchScript,
  registerPitchScriptDiscord,
} from "pitchscript";

const client = new Client({ intents: [/* your configured intents */] });
const prisma = new PrismaClient();

const pitchScript = createFCDexPitchScript(prisma, {
  host: {
    createDefaults: {
      // capacity_logic is required by the supplied Prisma schema.
      // Replace this empty object with the capacity logic your bot uses.
      Club: { capacity_logic: {} },
    },
  },
});

registerPitchScriptDiscord(client, pitchScript, {
  ownerIds: ["YOUR_DISCORD_USER_ID"],
  repository: "YOUR_GITHUB_OWNER/PitchScript",
});
```

The host stores uploaded images in the configured media directory. You can override the `saveAttachment` host option to match your deployment's storage layout.

**Schema note:** the supplied FCDex files disagree about `Ball.regime_id`: `prisma/schema.prisma` declares `regimeId BigInt?`, while `prisma/schema.sql` declares `regime_id bigint NOT NULL`. PitchScript follows the Prisma model and treats this field as optional; if your live database was created from the SQL snapshot, reconcile the mismatch before using `CREATE > CLUB`. The SQL snapshot also has no `Regime` table/model, so PitchScript does not invent a regime record or ID. PitchScript does not migrate your database.

## Scope

This repository contains the PitchScript library and Discord integration. It is not the FCDex web admin-panel UI itself; the admin panel must integrate the engine and host with its own routes and permissions.

## License

MIT. See [LICENSE](LICENSE).
