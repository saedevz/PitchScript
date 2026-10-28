# PitchScript

A TypeScript implementation of the DexScript DSL for FCDex.

PitchScript follows the command syntax and behavior of
[Caylies/DexScript](https://github.com/Caylies/DexScript), with
the goal of integrating it into a TypeScript codebase.

## Development status

Early development. The parser foundation is being implemented first.
The command runtime and FCDex integration are not complete.

## Syntax compatibility target

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

### Saved eval commands

```text
EVAL > SAVE > NAME
EVAL > REMOVE > NAME
EVAL > LIST
EVAL > RUN > NAME
```

### File commands

```text
FILE > READ > FILE_PATH
FILE > WRITE > FILE_PATH
FILE > CLEAR > FILE_PATH
FILE > LISTDIR > FILE_PATH(?)
FILE > DELETE > FILE_PATH
```

### Template commands

```text
TEMPLATE > CREATE > MODEL > ARGUMENT(?)
```

These are compatibility targets taken from the original DexScript
source. Listing a command here does not mean it has been implemented
in PitchScript yet.

## Technology

- TypeScript
- Node.js
- pnpm
- Vitest

## License

MIT. See [LICENSE](LICENSE).
