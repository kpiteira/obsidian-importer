export interface PluginSettings {
  apiKey: string;
  llmEndpoint: string;
  model: string;
  defaultFolder: string;
  debug: boolean;
}

export const DEFAULT_SETTINGS: PluginSettings = {
  apiKey: "",
  llmEndpoint: "https://router.requesty.io/v1/chat/completions",
  model: "google/gemini-2.0-flash-exp",
  defaultFolder: "Sources/YouTube",
  debug: false,
};

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