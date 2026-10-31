import {
  existsSync,
  statSync,
} from "node:fs";

import {
  access,
} from "node:fs/promises";

import {
  basename,
  join,
  relative,
} from "node:path";

const STATIC =
  existsSync("static") && statSync("static").isDirectory();

export const MEDIA_PATH = STATIC
  ? "./static/uploads"
  : "./admin_panel/media";

const START_CODE_BLOCK_RE = /^((```sql?)(?=\s)|(```))/;
const FILENAME_RE = /^(.+)(\.\S+)$/;

export interface SaveableAttachment {
  readonly filename: string;
  save(path: string): Promise<void>;
}

function removeMatchingBlocks(
  a: string,
  b: string,
): number {
  const pending: Array<[number, number, number, number]> = [
    [0, a.length, 0, b.length],
  ];

  let matching = 0;

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

    matching += bestSize;

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

  return matching;
}

function similarityRatio(a: string, b: string): number {
  if (a.length + b.length === 0) {
    return 1;
  }

  return (
    (2 * removeMatchingBlocks(a, b)) /
    (a.length + b.length)
  );
}

export function pascalCase(input: string): string {
  const lower = input.toLowerCase();

  if (lower.length === 0) {
    return "";
  }

  const capitalized =
    lower[0]!.toUpperCase() + lower.slice(1);

  return capitalized.replace(
    /_[a-z]/g,
    (match) => match[1]!.toUpperCase(),
  );
}

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
    .sort(
      (a, b) =>
        b.ratio - a.ratio || a.index - b.index,
    )
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

export function removeCodeMarkdown(
  content: string,
): string {
  if (
    content.startsWith("```") &&
    content.endsWith("```")
  ) {
    return content
      .replace(START_CODE_BLOCK_RE, "")
      .slice(0, -3);
  }

  return content.replace(/^[` \n]+|[` \n]+$/g, "");
}

export function imagePath(path: string): string {
  let relativePath = path.replace(
    "/static/uploads/",
    "",
  );

  if (STATIC && relativePath.startsWith(".")) {
    relativePath = relativePath.slice(1);
  }

  return join(MEDIA_PATH, relativePath);
}

export function isImage(path: string): boolean {
  try {
    return statSync(imagePath(path)).isFile();
  } catch {
    return false;
  }
}

export function isDate(input: string): boolean {
  if (input.trim() === "") {
    return false;
  }

  const date = new Date(input);

  return !Number.isNaN(date.getTime());
}

export function fetchModel<T>(
  name: string,
  models: ReadonlyMap<string, T>,
): T | undefined {
  return models.get(pascalCase(name).toLowerCase());
}

/**
 * Port of Utils.save_file().
 *
 * The attachment's save() method is supplied by the caller,
 * allowing Discord-specific attachment objects to stay outside
 * the PitchScript core.
 */
export async function saveAttachment(
  attachment: SaveableAttachment,
  mediaDirectory = MEDIA_PATH,
): Promise<string> {
  const filename = basename(attachment.filename);
  const match = FILENAME_RE.exec(filename);

  if (!match) {
    throw new TypeError(
      "The file you uploaded lacks an extension.",
    );
  }

  const [, filenameStem, extension] = match;

  let path = join(mediaDirectory, filename);
  let index = 1;

  async function exists(target: string): Promise<boolean> {
    try {
      await access(target);
      return true;
    } catch {
      return false;
    }
  }

  while (await exists(path)) {
    path = join(
      mediaDirectory,
      `${filenameStem}-${index}${extension}`,
    );

    index += 1;
  }

  await attachment.save(path);

  return relative(mediaDirectory, path);
}
