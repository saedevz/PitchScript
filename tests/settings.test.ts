import { describe, expect, it } from "vitest";

import {
  applySetting,
  createDefaultSettings,
} from "../src/settings.js";

describe("PitchScript settings", () => {
  it("uses the original default values", () => {
    expect(createDefaultSettings()).toEqual({
      debug: false,
      versioncheck: false,
      reference: "main",
    });
  });

  it("toggles a boolean when no value is given", () => {
    const settings = createDefaultSettings();

    const result = applySetting(settings, "debug");

    expect(result.valid).toBe(true);
    expect(settings.debug).toBe(true);
  });

  it("preserves the original truthiness behavior for boolean values", () => {
    const settings = createDefaultSettings();

    applySetting(settings, "versioncheck", "false");

    // Python bool("false") is True; this intentionally matches that behavior.
    expect(settings.versioncheck).toBe(true);
  });

  it("updates the configured reference", () => {
    const settings = createDefaultSettings();

    applySetting(settings, "reference", "main");

    expect(settings.reference).toBe("main");
  });

  it("rejects unknown settings", () => {
    const settings = createDefaultSettings();

    const result = applySetting(settings, "unknown");

    expect(result.valid).toBe(false);
    expect(result.message).toBe(
      "`unknown` is not a valid setting.",
    );
  });
});
