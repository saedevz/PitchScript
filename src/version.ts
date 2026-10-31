import type { PitchScriptSettings } from "./settings.js";

export interface VersionCheckOptions {
  readonly currentVersion: string;
  readonly repository?: string;
}

interface GitHubContentResponse {
  readonly content?: string;
}

function extractVersion(content: string): string | undefined {
  return content.match(
    /^\s*version\s*=\s*["']([^"']+)["']/m,
  )?.[1];
}

/**
 * Port of the original check_version() behavior.
 *
 * Returns an update notice when a different repository version
 * is found, or null when checks are disabled or no update is found.
 */
export async function checkPitchScriptVersion(
  settings: PitchScriptSettings,
  options: VersionCheckOptions,
): Promise<string | null> {
  if (!settings.versioncheck) {
    return null;
  }

  if (!options.repository) {
    throw new Error(
      "A GitHub repository must be configured when version checking is enabled.",
    );
  }

  const [owner, repository, ...extra] =
    options.repository.split("/");

  if (!owner || !repository || extra.length > 0) {
    throw new Error(
      'Repository must use the "owner/repository" format.',
    );
  }

  const ref = settings.reference;
  const query = ref
    ? `?ref=${encodeURIComponent(ref)}`
    : "";

  const url =
    `https://api.github.com/repos/${owner}/${repository}` +
    `/contents/pyproject.toml${query}`;

  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data =
    (await response.json()) as GitHubContentResponse;

  if (!data.content) {
    return null;
  }

  const content = Buffer.from(
    data.content.replace(/\s/g, ""),
    "base64",
  ).toString("utf8");

  const latestVersion = extractVersion(content);

  if (
    !latestVersion ||
    latestVersion === options.currentVersion
  ) {
    return null;
  }

  return (
    `Your PitchScript version (${options.currentVersion}) is outdated. ` +
    `Please update to version (${latestVersion}).`
  );
}
