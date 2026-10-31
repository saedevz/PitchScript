# PitchScript

A TypeScript implementation of the DexScript DSL for FCDex.

PitchScript preserves DexScript's command-oriented syntax while
providing integration with a TypeScript and Prisma-based codebase.

## Development status

PitchScript is under development. The parser, command handlers,
and FCDex adapter must pass the build and compatibility tests
before the package is considered ready for production.

## Commands

### Global commands

```text
CREATE > MODEL > IDENTIFIER
DELETE > MODEL > IDENTIFIER
UPDATE > MODEL > IDENTIFIER > ATTRIBUTE > VALUE(?)
VIEW > MODEL > IDENTIFIER > ATTRIBUTE(?)
ATTRIBUTES > MODEL > FILTER(?)
```

### Filter commands

```text
FILTER > UPDATE > MODEL > ATTRIBUTE > OLD_VALUE > NEW_VALUE > TORTOISE_OPERATOR(?)
FILTER > DELETE > MODEL > ATTRIBUTE > VALUE > TORTOISE_OPERATOR(?)
FILTER > VIEW > MODEL > ATTRIBUTE > VALUE > TORTOISE_OPERATOR(?)
```

### Saved evals

```text
EVAL > SAVE > NAME
EVAL > REMOVE > NAME
EVAL > LIST
EVAL > RUN > NAME
```

Saved evals contain PitchScript source and are executed by the
PitchScript interpreter.

### File commands

```text
FILE > READ > FILE_PATH
FILE > WRITE > FILE_PATH
FILE > CLEAR > FILE_PATH
FILE > LISTDIR > FILE_PATH(?)
FILE > DELETE > FILE_PATH
```

### Templates

```text
TEMPLATE > CREATE > MODEL > ARGUMENT(?)
```

## TypeScript integration

PitchScript exposes a parser, dispatcher, command handlers,
and an FCDex adapter through its package entry point.

The database adapter must be configured against the target
application's actual Prisma schema.

## Development

Install dependencies:

```bash
npm install
```

Build the package:

```bash
npm run build
```

Run tests:

```bash
npm test
```

## License

MIT. See [LICENSE](LICENSE).
