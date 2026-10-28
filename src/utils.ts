import { existsSync, statSync } from "node:fs";
import { join } from "node:path";

const STATIC = existsSync("static");

const MEDIA_PATH = STATIC
  ? "./static/uploads"
  : "./admin_panel/media";

const START_CODE_BLOCK_RE = /^((```sql?)(?=\s)|(```))/;

function removeMatchingBlocks(
  a: string,
  b: string,
): number {
  const pending: Array<[number, number, number, number]> = [
    [0, a.length, 0, b.length],
  ];

  const blocks: Array<[number, number, number]> = [];

  while (pending.length > 0) {
    const [aStart, aEnd, bStart, bEnd] = pending.pop()!;

    const previous = new Uint32Array(bEnd - bStart + 1);
    let bestSize = 0;
    let bestA = aStart;
    let bestB = bStart;

    for (let i = aStart; i < aEnd; i++) {
      const current = new Uint32Array(bEnd - bStart + 1);

      for (let j = bStart; j < bEnd; j++) {
        if (a[i] !== b[j]) {
          continue;
        }

        current[j - bStart + 1] =
          previous[j - bStart] + 1;

        const size = current[j - bStart + 1];

        if (size > bestSize) {
          bestSize = size;
          bestA = i - size + 1;
          bestB = j - size + 1;
        }
      }

      previous.set(current);
    }

    if (bestSize === 0) {
      continue;
    }

    blocks.push([bestA, bestB, bestSize]);

    pending.push([
      bestA + bestSize,
      aEnd,
      bestB + bestSize,
      bEnd,
    ]);

    pending.push([
      aStart,
      bestA,
      bStart,
      bestB,
    ]);
  }

  // Matching blocks are disjoint; count their matched characters.
  return blocks.reduce((total, block) => total + block[2], 0);
}

/**
 * Computes the similarity ratio used by Python's SequenceMatcher.
 *
 * This supports the close-match behavior in the original Utils.autocorrect.
 */
function similarityRatio(a: string, b: string): number {
  if (a.length + b.length === 0) {
    return 1;
  }

  const matching = removeMatchingBlocks(a, b);

  return (2 * matching) / (a.length + b.length);
}

/**
 * Port of Utils.pascal_case().
 */
export function pascalCase(input: string): string {
  const lower = input.toLowerCase();

  if (lower.length === 0) {
    return "";
  }

  const capitalized = lower[0]!.toUpperCase() + lower.slice(1);

  return capitalized.replace(
    /_[a-z]/g,
    (match) => match[1]!.toUpperCase(),
  );
}

/**
 * Port of Utils.autocorrect().
 *
 * The original suggests close matches but still requires an exact match.
 * It is deliberately not an automatic correction mechanism.
 */
export function autocorrect(
  input: string,
  candidates: readonly string[],
  error = "does not exist.",
): string {
  const ranked = candidates
    .map((candidate, index) => ({
      candidate,
      index,
      ratio: similarityRatio(input, candidate),
    }))
    .filter(({ ratio }) => ratio >= 0.6)
    .sort((a, b) => b.ratio - a.ratio || a.index - b.index)
    .slice(0, 3);

  const best = ranked[0]?.candidate;

  if (!best || best !== input) {
    const suggestion = best
      ? `\nDid you mean '${best}'?`
      : "";

    throw new Error(`'${input}' ${error}${suggestion}`);
  }

  return best;
}

/**
 * Port of Utils.remove_code_markdown().
 */
export function removeCodeMarkdown(content: string): string {
  if (content.startsWith("```") && content.endsWith("```")) {
    return content.replace(START_CODE_BLOCK_RE, "").slice(0, -3);
  }

  return content.replace(/^[` \n]+|[` \n]+$/g, "");
}

/**
 * Port of Utils.image_path().
 */
export function imagePath(path: string): string {
  let relativePath = path.replaceAll("/static/uploads/", "");

  if (STATIC && relativePath.startsWith(".")) {
    relativePath = relativePath.slice(1);
  }

  return join(MEDIA_PATH, relativePath);
}

/**
 * Port of Utils.is_image().
 */
export function isImage(path: string): boolean {
  try {
    return statSync(imagePath(path)).isFile();
  } catch {
    return false;
  }
}

/**
 * Port of Utils.fetch_model() for an explicitly supplied registry.
 */
export function fetchModel<T>(
  name: string,
  models: ReadonlyMap<string, T>,
): T | undefined {
  return models.get(pascalCase(name).toLowerCase());
}
