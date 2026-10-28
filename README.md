# PitchScript

**A TypeScript-native implementation of DexScript for FCDex.**

PitchScript is a command-based DSL inspired by [DexScript](https://github.com/Caylies/DexScript), designed to make managing collectible data easier through readable commands.

## Goals

- Preserve DexScript's familiar command syntax.
- Provide TypeScript-native integration.
- Support creating, viewing, updating, and deleting records.
- Support bulk operations.
- Save and execute reusable evals.
- Integrate with FCDex and its custom admin panel.
- Improve parsing, validation, error messages, and maintainability.

## Example

```text
VIEW > CLUB > Manchester City > RARITY >
```

Example result:

```text
T5
```

*Syntax and compatibility are subject to implementation.*

## Technology

- TypeScript
- Bun / Node.js
- FCDex integration

## Status

Early development.

## License

MIT. See [LICENSE](LICENSE).

PitchScript is inspired by DexScript by Cayla. Original code and notices are retained where applicable.
