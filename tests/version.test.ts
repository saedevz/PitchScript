import { afterEach, describe, expect, it, vi } from "vitest";

import {
  checkPitchScriptVersion,
} from "../src/version.js";

import { createDefaultSettings } from "../src/settings.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("checkPitchScriptVersion", () => {
  it("does not request GitHub when checks are disabled", async () => {
    const fetchMock = vi.fn();

    vi.stubGlobal("fetch", fetchMock);

    const result = await checkPitchScriptVersion(
      createDefaultSettings(),
      {
        currentVersion: "0.1.0",
        repository: "owner/repo",
      },
    );

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns an update notice when GitHub has a different version", async () => {
    const settings = {
      debug: false,
      versioncheck: true,
      reference: "main",
    };

    const content = Buffer.from(
      '[project]\nversion = "0.2.0"\n',
      "utf8",
    ).toString("base64");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ content }),
      })),
    );

    const result = await checkPitchScriptVersion(
      settings,
      {
        currentVersion: "0.1.0",
        repository: "owner/repo",
      },
    );

    expect(result).toContain("0.1.0");
    expect(result).toContain("0.2.0");
  });

  it("returns null when versions match", async () => {
    const settings = {
      debug: false,
      versioncheck: true,
      reference: "main",
    };

    const content = Buffer.from(
      '[project]\nversion = "0.1.0"\n',
      "utf8",
    ).toString("base64");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ content }),
      })),
    );

    await expect(
      checkPitchScriptVersion(settings, {
        currentVersion: "0.1.0",
        repository: "owner/repo",
      }),
    ).resolves.toBeNull();
  });
});
