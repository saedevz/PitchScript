export interface PitchScriptSettings {
  debug: boolean;
  versioncheck: boolean;
  reference: string | null;
}

export interface SettingResult {
  readonly valid: boolean;
  readonly setting: string;
  readonly value?: boolean | string | null;
  readonly message: string;
}

export function createDefaultSettings(): PitchScriptSettings {
  return {
    debug: false,
    versioncheck: false,
    reference: "main",
  };
}

function formatSettingValue(
  value: boolean | string | null,
): string {
  if (value === null) return "None";
  if (value === true) return "True";
  if (value === false) return "False";

  return value;
}

/**
 * Port of the original cog's setting command.
 *
 * In the original Python implementation, a non-empty string
 * supplied to a boolean setting evaluates to true, including
 * the string "false". This preserves that behavior.
 */
export function applySetting(
  settings: PitchScriptSettings,
  name: string,
  value?: string,
): SettingResult {
  const key = name.toLowerCase();

  if (!Object.hasOwn(settings, key)) {
    return {
      valid: false,
      setting: key,
      message: `\`${key}\` is not a valid setting.`,
    };
  }

  const current = settings[key as keyof PitchScriptSettings];

  let newValue: boolean | string | null;

  if (typeof current === "boolean") {
    newValue = value
      ? Boolean(value)
      : !current;
  } else {
    newValue = value ?? null;
  }

  settings[key as keyof PitchScriptSettings] =
    newValue as never;

  return {
    valid: true,
    setting: key,
    value: newValue,
    message:
      `\`${key}\` has been set to ` +
      `\`${formatSettingValue(newValue)}\``,
  };
}
