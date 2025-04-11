export interface PluginSettings {
  apiKey: string;
  llmEndpoint: string;
  model: string;
  defaultFolder: string;
  promptTemplate: string;
  debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: "",
  llmEndpoint: "REQUESTY_DEFAULT_URL",
  model: "gpt-3.5-turbo",
  defaultFolder: "Imported/YouTube",
  promptTemplate: "",
  debug: false,
};

/**
 * Validates that a string is a valid HTTP(S) URL and not localhost/loopback.
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (
      parsed.hostname === "localhost" ||
      parsed.hostname.startsWith("127.") ||
      parsed.hostname.startsWith("::1")
    ) {
      return false;
    }
    return ["http:", "https:"].includes(parsed.protocol);
  } catch (e) {
    return false;
  }
}

/**
 * Loads plugin settings using Obsidian's data API, merging with DEFAULT_SETTINGS.
 * @param plugin The plugin instance (must implement loadData)
 */
export async function loadSettings(plugin: { loadData: () => Promise<Partial<PluginSettings> | null> }): Promise<PluginSettings> {
  const loaded = (await plugin.loadData()) || {};
  return { ...DEFAULT_SETTINGS, ...loaded };
}

/**
 * Saves plugin settings using Obsidian's data API.
 * @param plugin The plugin instance (must implement saveData)
 * @param settings The settings to save
 */
export async function saveSettings(
  plugin: { saveData: (data: PluginSettings) => Promise<void> },
  settings: PluginSettings
): Promise<void> {
  await plugin.saveData(settings);
}